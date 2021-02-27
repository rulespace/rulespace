import { Sets, assertTrue } from './common.mjs';
import { Atom, Neg, Agg, Var, Lit } from './rsp.mjs';
import { analyzeProgram } from './analyzer.mjs';

// class LineEmitter
// {
//   constructor()
//   {
//     this.lines = [];
//   }
//   add(line)
//   {
//     this.lines.push(line);
//   }
//   toString()
//   {
//     return this.lines.join('\n');
//   }
// }

class DynamicVars
{
  constructor(initial)
  {
    this.initial = initial;
    this.vars = new Set();
  }
  add(name)
  {
    this.vars.add(name);
  }
  names()
  {
    return [...this.vars];
  }
  toString()
  {
    return [...this.vars].map(name => `let ${name} = ${this.initial}`).join('\n');
  }  
}

export function rsp2js(program, options={})
{
  // const parser = new SchemeParser();
  // const program = parser.parse(src);

  const analysis = analyzeProgram(program);
  const strata = analysis.strata;
  const preds = analysis.preds;
  const edbPreds = preds.filter(pred => pred.edb);
  const rules = analysis.program.rules;

  // options + emitters
  const OPT_module = options.module === true ? true : false;
  const FLAG_compile_to_module = OPT_module;
  const FLAG_compile_to_ctr = !OPT_module;
  const publicFunctions = [];
  const publicFunction = name => { publicFunctions.push(name); return `${FLAG_compile_to_module ? 'export ' : ''}function ${name}`};
  const publicFunctionStar = name => { publicFunctions.push(name); return `${FLAG_compile_to_module ? 'export ' : ''}function* ${name}`};

  
  const FLAG_debug = options.debug === true ? true : false;
  const logDebug = FLAG_debug ? str => `console.log(${str})` : () => ``;

  const FLAG_profile = options.profile === true ? true : false;
  const profileVars = new DynamicVars("0");
  // const profile = FLAG_profile ? str => str : () => ``;
  const profileStart = FLAG_profile ? name => `const ${name}Start = performance.now();` : () => ``;
  const profileEnd = FLAG_profile ? name =>
    { 
      profileVars.add(name + "Duration");
      profileVars.add(name + "Calls");
      return `
        ${name}Duration += performance.now() - ${name}Start;
        ${name}Calls++;
        `;
    } : () => ``;

  const FLAG_assertions = options.assertions === true ? true : false;
  const assert = FLAG_assertions ? (condition, display='"(?)"', explanation='assertion failed') => `if (!(${condition})) {throw new Error(${display} + ': ${explanation}')} ` : () => ``;
  // end options + emitters

  function main()
  {

    const sb = [profileVars];

    if (FLAG_compile_to_ctr)
    {
      sb.push(`"use strict";`);
    }

    if (FLAG_compile_to_module && FLAG_profile)
    {
      sb.push(`import { performance } from 'perf_hooks'`);
    }

    // const dynamicEmitFirst = new LineEmitter();
    // sb.push(dynamicEmitFirst);

    if (FLAG_profile)
    {
      sb.push(`console.log("profiling on")`);
    }
    if (FLAG_assertions)
    {
      sb.push(`console.log("assertions on")`);
    }

    sb.push(emitFirst());

    for (const pred of preds)
    {
      sb.push(`
  //////////////////////////////////////////////////
  // ${pred.edb ? 'ebd' : 'idb'} pred ${pred.name}(${pred.arity})
  // precedes: ${[...pred.precedes].join(',')}
  // posDependsOn: ${[...pred.posDependsOn].join(',')}
  // negDependsOn: ${[...pred.negDependsOn].join(',')}
  // negated: ${pred.negated}
      `);

      sb.push(emitTupleObject(pred));
      //sb.push(emitGetTuple(pred));
      sb.push(emitDeltaAddTuple(pred));
      // if (pred.edb)
      // {
      //   sb.push(emitAddTuple(pred, strata));
      // }
      for (const rule of pred.rules)
      {
        sb.push(`/* ${rule} */`);
        if (rule.aggregates())
        {
          sb.push(emitRuleGBObject(rule));
        }
        else
        {
          sb.push(emitRule(rule));
        }
      }
    }

    const pred2getters = preds.map(pred => `['${pred}', get_${pred}]`);
    sb.push(`const pred2getter = new Map([${pred2getters.join()}])`);
  

  sb.push(emitAddTuples(strata, preds));
  sb.push(emitRemoveTuples());
  
  sb.push(emitIterators(preds, edbPreds, rules));
  sb.push(emitClear(edbPreds));

  if (FLAG_profile)
  {
    sb.push(emitProfileResults());
  }

  if (FLAG_compile_to_ctr)
  {
    sb.push(`return {${publicFunctions.join(', ')}};`);
  }

  sb.push(`// the end`);

  return sb.join('\n');
  } // main

  function emitGet(pred, arity)
  {
    const tn = termNames2(arity);
    const maps = [`${pred}_members`].concat(Array.from(Array(arity), (_, i) => "l" + i));
    const sb = [`
function get_${pred}(${tn.join(', ')})
{
    `];
    for (let i = 0; i < arity; i++)
    {
      sb.push(`
      const ${maps[i+1]} = ${maps[i]}.get(t${i});
      if (${maps[i+1]} === undefined)
      {
        return null;
      }
      `)
    }
    sb.push(`return ${maps[arity]};
}
    `);
    return sb.join('\n');
  }

  
  function emitAddGet(pred, arity)
  {

    function emitEntry(i)
    {
      if (i === arity)
      {
        return `tuple`;
      }
      return `new Map([[t${i}, ${emitEntry(i+1)}]])`;
    }

    const tn = termNames2(arity);
    const maps = [`${pred}_members`].concat(Array.from(Array(arity), (_, i) => "l" + i));
    const sb = [`
function add_get_${pred}(${tn.join(', ')})
{
    `];
    for (let i = 0; i < arity; i++)
    {
      sb.push(`
      const ${maps[i+1]} = ${maps[i]}.get(t${i});
      if (${maps[i+1]} === undefined)
      {
        const tuple = new ${pred}(${tn.join(', ')});
        ${maps[i]}.set(t${i}, ${emitEntry(i+1)});
        return tuple;
      }
      `)
    }
    sb.push(`
    return ${maps[arity]};
}
    `);
    return sb.join('\n');
  }

  function emitRemove(pred, arity)
  {
    const tn = termNames2(arity);
    const maps = [`${pred}_members`].concat(Array.from(Array(arity), (_, i) => "l" + i));
    const sb = [`
function remove_${pred}(${tn.join(', ')})
{
    `];
    for (let i = 0; i < arity-1; i++)
    {
      sb.push(`
      const ${maps[i+1]} = ${maps[i]}.get(t${i});
      `)
    }
    sb.push(`
    ${maps[arity - 1]}.set(t${arity-1}, undefined);
}
    `);
    return sb.join('\n');
  }


  function emitSelect(pred, arity)
  {
    const maps = [`${pred}_members`].concat(Array.from(Array(arity), (_, i) => "l" + i));

    function emitLookup(i)
    {
      if (i === arity)
      {
        return `yield ${maps[arity]}`;
      }
      return `
        for (const ${maps[i+1]} of ${maps[i]}.values())
        {
          if (${maps[i+1]} !== undefined)
          {
            ${emitLookup(i+1)}
          }
        }
        `;
    }
    
    return `
function* select_${pred}()
{
    ${emitLookup(0)}
}
    `;
  }



function emitTupleObject(pred)
{
  const tn = termNames(pred);
  const termAssignments = tn.map(t => `this.${t} = ${t};`);
  const termFields = tn.map(t => `this.${t}`);
  const termEqualities = tn.map(t => `Object.is(member.${t}, ${t})`);

  let sb = `
const ${pred}_members = new Map();
function ${pred}(${tn.join(', ')})
{
  ${termAssignments.join('\n  ')}
  this._inproducts = ${pred.edb ? `new Set(); //TODO will/should never be added to` : `new Set();`}
  this._outproducts = new Set();
  this._outproductsgb = new Set();
  this._generic = null;
}
// public API (only)
// ${pred}.prototype.get = function () {return get_${pred}(${termFields.join(', ')})};
//
${pred}.prototype.toString = function () {return atomString("${pred}", ${termFields.join(', ')})};
${pred}.prototype._remove = function () {
  remove_${pred}(${termFields.join(', ')});
};
${pred}.prototype.toGeneric = function () {
  if (this._generic === null)
  {
    const generic = ['${pred}', ${termFields.join(', ')}];
    this._generic = generic;
    return generic;
  }
  return this._generic;
};

${emitGet(`${pred}`, pred.arity)}
${emitAddGet(`${pred}`, pred.arity)}
${emitRemove(`${pred}`, pred.arity)}
${emitSelect(`${pred}`, pred.arity)}


`;

  if (pred.negated)
  {
    sb += `
const NOT_${pred}_members = new Map();
function NOT_${pred}(${tn.join(', ')})
{
  ${termAssignments.join('\n  ')}  
  this._inproducts = new Set(); // TODO: invariant: no inproducts?
  this._outproducts = new Set();
  this._generic = null;
}        
NOT_${pred}.prototype.toString = function () {return atomString("!${pred}", ${termFields.join(', ')})};  
NOT_${pred}.prototype._remove = function () {
  remove_NOT_${pred}(${termFields.join(', ')});
};
NOT_${pred}.prototype.toGeneric = function () {
  if (this._generic === null)
  {
    const generic = ['!${pred}', ${termFields.join(', ')}];
    this._generic = generic;
    return generic;
  }
  return this._generic;
};


${emitGet(`NOT_${pred}`, pred.arity)}
${emitAddGet(`NOT_${pred}`, pred.arity)}
${emitRemove(`NOT_${pred}`, pred.arity)}
    `;
  }

  return sb;
}

function compileRuleFireBody(rule, head, body, i, compileEnv, ptuples)
{
  if (i === body.length)
  {
    const pred = head.pred;
    const t2ps = ptuples.map(tuple => `${tuple}._outproducts.add(product);`);
    const noRecursionConditions = ptuples.map(tuple => `${tuple} !== existing_${pred}_tuple`);
    return `
      // updates for ${head}
      const existing_${pred}_tuple = get_${pred}(${head.terms.join(', ')});
      if (existing_${pred}_tuple === null)
      {
        const new_${pred}_tuple = add_get_${pred}(${head.terms.join(', ')});
        newTuples.add(new_${pred}_tuple);
        const product = new Rule${rule._id}Product(${ptuples.join(', ')});
        ${t2ps.join('\n        ')}
        product._outtuple = new_${pred}_tuple;
        new_${pred}_tuple._inproducts.add(product);
      }
      else if (${noRecursionConditions.join(' && ')}) // remove direct recursion
      {
        const product = new Rule${rule._id}Product(${ptuples.join(', ')});
        ${t2ps.join('\n        ')}
        product._outtuple = existing_${pred}_tuple;
        existing_${pred}_tuple._inproducts.add(product);
      }
    `;
  }


  const atom = body[i];

  if (atom instanceof Atom)
  {
    const tuple = "tuple" + i;
    ptuples.push(tuple);
    const pred = atom.pred;
    const bindUnboundVars = [];
    const conditions = [];
    atom.terms.forEach((term, i) => {
      if (term instanceof Var)
      {
        if (compileEnv.has(term.name))
        {
          conditions.push(`${tuple}.t${i} === ${term.name}`);
        }
        else
        {
          bindUnboundVars.push(`const ${term.name} = ${tuple}.t${i};`);
          compileEnv.add(term.name);
        }
      }
      else if (term instanceof Lit)
      {
        conditions.push(`${tuple}.t${i} === ${termToString(term.value)}`);
      }
      else
      {
        throw new Error("cannot handle " + term);
      }
    });

    if (conditions.length === 0)
    {
      return `
      // atom ${atom} [no conditions]
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : select_${pred}()))
      {
        ${bindUnboundVars.join('\n        ')}
        ${compileRuleFireBody(rule, head, body, i+1, compileEnv, ptuples)}
      }
      `;  
    }
    else
    {
      return `
      // atom ${atom} [conditions]
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : select_${pred}()))
      {
        if (${conditions.join(' && ')})
        {
          ${bindUnboundVars.join('\n       ')}
          ${compileRuleFireBody(rule, head, body, i+1, compileEnv, ptuples)}
        }
      }
      `;  
    }
  }

  if (atom instanceof Neg)
  {
    const natom = atom.atom;
    const tuple = "tuple" + i;
    ptuples.push('NOT_' + tuple);
    const pred = natom.pred;
    //const bindUnboundVars = [];
    const getValues = [];
    natom.terms.forEach((term, i) => {
      if (term instanceof Var)
      {
        if (compileEnv.has(term.name))
        {
          getValues.push(`${term.name}`);
        }
        else
        {
          throw new Error("unbound var in negation: " + term.name);
        }
      }
      else if (term instanceof Lit)
      {
        getValues.push(`${termToString(term.value)}`);
      }
      else
      {
        throw new Error();
      }
    });

    return `
    // atom ${atom} [conditions]
    if (get_${pred}(${getValues.join(', ')}) !== null)
    {
      continue;
    }
    const NOT_${tuple} = add_get_NOT_${pred}(${natom.terms.join(', ')});
    ${compileRuleFireBody(rule, head, body, i+1, compileEnv, ptuples)}
    `;  
  }// Neg


  if (atom instanceof Assign)
  {
    assertTrue(atom.operator === '='); // nothing else supported at the moment
    assertTrue(atom.left instanceof Var); // nothing else supported at the moment
    const name = atom.left.name;
    if (compileEnv.has(name))
    {
      throw new Error("assigning bound name: " + name);
    }
    compileEnv.add(name);
    const left = compileTerm(atom.left);
    const right = compileTerm(atom.right);
    return `
      // assign ${atom}
      const ${left} = ${right};

      ${compileRuleFireBody(rule, head, body, i+1, compileEnv, ptuples)}
    `;
  }

  throw new Error(body[i]);
}

// (Reachable x y) :- (Reachable x z) (Link z y)
function emitRule(rule)
{
  const compileEnv = new Set();

  const tupleArity = rule.body.reduce((acc, exp) => ((exp instanceof Atom) || (exp instanceof Neg)) ? acc+1 : acc, 0);
  const tupleParams = Array.from({length:tupleArity}, (_, i) => `tuple${i}`);
  const tupleFieldInits = Array.from(tupleParams, tp => `this.${tp} = ${tp};`);
  const tupleFields = Array.from(tupleParams, tp => `this.${tp}`);

  return `
/* rule (tuple arity ${tupleArity}) (no aggregates)
${rule} 
*/

class Rule${rule._id}Product
{
  constructor(${tupleParams.join(', ')})
  {
    ${tupleFieldInits.join('\n')}
    this._outtuple = null; // TODO make this ctr param!
  }

  toString()
  {
    return "r${rule._id}:" + this.tuples.join('.');
  }

  tuples() // or, a field initialized in ctr?
  {
    return [${tupleFields.join(', ')}];
  }
}

function fireRule${rule._id}(deltaPos, deltaTuples)
{
  ${logDebug(`"fire ${rule}"`)}
  ${logDebug('`deltaPos ${deltaPos}`')}
  ${logDebug('`deltaTuples ${[...deltaTuples].join()}`')}

  ${profileStart(`fireRule${rule._id}`)}

  const newTuples = new Set();

  ${compileRuleFireBody(rule, rule.head, rule.body, 0, compileEnv, [])}

  ${profileEnd(`fireRule${rule._id}`)}

  ${logDebug('`=> newTuples ${[...newTuples].join()}`')}

  return newTuples;
} // end fireRule${rule._id}
  `;
}

function compileRuleGBFireBody(rule, head, body, i, compileEnv, ptuples)
{
  if (i === body.length)
  {
    const agg = head.terms[head.terms.length - 1];
    assertTrue(agg instanceof Agg);
    const aggregate = agg.aggregate;
    const gb = head.terms.slice(0, head.terms.length - 1);
    return `
      // updates for ${head}
      const ptuples = new Set([${ptuples.join()}]);
      const productGB = new ProductGB(${rule._id}, ptuples, ${aggregate});
      const groupby = add_get_Rule${rule._id}GB(${gb.join()}); // TODO!!!!

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [${aggregate}]);
        }
        else
        {
          currentAdditionalValues.push(${aggregate});
        }
        for (const tuple of ptuples)
        {
          tuple._outproductsgb.add(productGB);
        }
        productGB._outgb = groupby;
      }
`;
  }


  const atom = body[i];

  if (atom instanceof Atom)
  {
    const tuple = "tuple" + i;
    ptuples.push(tuple);
    const pred = atom.pred;
    const bindUnboundVars = [];
    const conditions = [];
    atom.terms.forEach((term, i) => {
      if (term instanceof Var)
      {
        if (compileEnv.has(term.name))
        {
          conditions.push(`${tuple}.t${i} === ${term.name}`);
        }
        else
        {
          bindUnboundVars.push(`const ${term.name} = ${tuple}.t${i};`);
          compileEnv.add(term.name);
        }
      }
      else if (term instanceof Lit)
      {
        conditions.push(`${tuple}.t${i} === ${termToString(term.value)}`);
      }
      else
      {
        throw new Error();
      }
    });

    if (conditions.length === 0)
    {
      return `
      // atom ${atom} [no conditions]
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : select_${pred}()))
      {
        ${bindUnboundVars.join('\n        ')}
        ${compileRuleGBFireBody(rule, head, body, i+1, compileEnv, ptuples)}
      }
      `;  
    }
    else
    {
      return `
      // atom ${atom} [conditions]
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : select_${pred}()))
      {
        if (${conditions.join('&&')})
        {
          ${bindUnboundVars.join('\n        ')}
          ${compileRuleGBFireBody(rule, head, body, i+1, compileEnv, ptuples)}
        }
      }
      `;  
    }
  }

  if (atom instanceof Assign)
  {
    assertTrue(atom.operator === '='); // nothing else supported at the moment
    assertTrue(atom.left instanceof Var); // nothing else supported at the moment
    const name = atom.left.name;
    if (compileEnv.has(name))
    {
      throw new Error("assigning bound name: " + name);
    }
    compileEnv.add(name);
    const left = compileTerm(atom.left);
    const right = compileTerm(atom.right);
    return `
      // assign ${atom}
      const ${left} = ${right};

      ${compileRuleGBFireBody(rule, head, body, i+1, compileEnv, ptuples)}
    `;
  }

  throw new Error(body[i]);
}

// (R x sum<z>) :- (X x) (I x y), z = y*y 
function emitRuleGBObject(rule)
{
  const pred = rule.head.pred;
  const compileEnv = new Set();
  const gbNames = Array.from(Array(rule.head.terms.length - 1), (_, i) => "groupby.t"+i);
  const aggregateName ="t" + (rule.head.terms.length - 1);

  const aggregator = rule.head.terms[rule.head.terms.length - 1].aggregator;
  let joinOperation; // join semilattice
  let addOperation, identityValue; // commutative group
  switch (aggregator)
  {
    case "max": joinOperation = "Math.max(acc, val)"; break;
    case "min": joinOperation = "Math.min(acc, val)"; break;
    case "sum": addOperation = "acc + val"; identityValue = 0; break;
    case "count": addOperation = "acc + 1"; identityValue = 0; break;
    default: throw new Error("Unknown aggregator: " + aggregator);
  }

  let updateOperation;
  if (joinOperation)
  {
    updateOperation = `currentResultTuple === null ? additionalValues.reduce((acc, val) => ${joinOperation}) : additionalValues.reduce((acc, val) => ${joinOperation}, currentResultTuple.${aggregateName})`
  }
  else if (addOperation)
  {
    updateOperation = `currentResultTuple === null ? additionalValues.reduce((acc, val) => ${addOperation}, ${identityValue}) : additionalValues.reduce((acc, val) => ${addOperation}, currentResultTuple.${aggregateName})`
  }
  else
  {
    throw new Error("No update operation for aggregator: " + aggregator)
  }

  const GBclass = emitRuleGBClass(rule);

  return `
/* rule [aggregates] 
${rule} 
*/
function fireRule${rule._id}(deltaPos, deltaTuples)
{
  ${logDebug(`"fire ${rule}"`)}
  ${logDebug('`deltaPos ${deltaPos}`')}
  ${logDebug('`deltaTuples ${[...deltaTuples].join()}`')}

  const newTuples = new Set();
  const tuplesToRemove = [];
  const updates = new Map(); // groupby -> additionalValues

  ${compileRuleGBFireBody(rule, rule.head, rule.body, 0, compileEnv, [])}
  
  // bind head ${rule.head}
  for (const [groupby, additionalValues] of updates)
  {
    const currentResultTuple = groupby._outtuple;
    const updatedValue = ${updateOperation};
    const updatedResultTuple = add_get_${pred}(${gbNames.join()}, updatedValue);  
    if (groupby._outtuple !== updatedResultTuple)
    {
      if (groupby._outtuple !== null)
      { 
        tuplesToRemove.push(groupby._outtuple);
      }
      groupby._outtuple = updatedResultTuple;
      newTuples.add(updatedResultTuple);
    }
  }

  ${logDebug('`=> newTuples ${[...newTuples].join()}`')}
  return [newTuples, tuplesToRemove];
} // end fireRule${rule._id}

${GBclass}

  `;
}

function emitRuleGBClass(rule)
{
  const numGbTerms = rule.head.terms.length - 1;
  const tn = Array.from(Array(numGbTerms), (_, i) => "t" + i);
  const termEqualities = tn.map(t => `Object.is(member.${t}, ${t})`);
  const termAssignments = tn.map(t => `this.${t} = ${t}`);
  const termToStrings = tn.map(t => `this.${t}`);
  const aggTerm = rule.head.terms[rule.head.terms.length - 1];
  return `
const Rule${rule._id}GB_members = new Set();
function Rule${rule._id}GB(${tn.join(', ')})
{
  ${termAssignments.join('; ')};
  this._outtuple = null;
}
Rule${rule._id}GB.prototype.toString = function () { return atomString('${rule.head.pred}', ${termToStrings.join(', ')}, ({toString: () => "${aggTerm}"})) };
Rule${rule._id}GB.prototype.rule = function () { return 'Rule${rule._id}'};

function add_get_Rule${rule._id}GB(${tn.join(', ')})
{
  for (const member of Rule${rule._id}GB_members)
  {
    if (${termEqualities.join(' && ')})
    {
      return member;
    }
  }
  const gb = new Rule${rule._id}GB(${tn.join(', ')});
  Rule${rule._id}GB_members.add(gb);
  return gb;
}
  `;
}

function emitIterators(preds, edbPreds, rules)
{
  const tupleYielders = preds.map(pred => `for (const t of select_${pred}()) {yield t.toGeneric()};`);
  const edbTupleYielders = edbPreds.map(pred => `for (const t of select_${pred}()) {yield t.toGeneric()};`);
  // const gbYielders = rules.flatMap((rule, i) => rule.aggregates() ? [`//yield* Rule${rule._id}GB.members;`] : []);

  return `
// from membership
${publicFunctionStar('tuples')}() 
{
  ${tupleYielders.join('\n  ')}
}

${publicFunctionStar('edbTuples')}() 
{
  ${edbTupleYielders.join('\n  ')}
}

${publicFunction('productsOut')}(tuple) 
{
  const mtuple = getMTuple(tuple);
  const products = [];
  for (const mp of mtuple._outproducts)
  {
    // TODO additional protection? (freezing, ...)
    products.push({rule:mp.rule, tuples: mp.tuples().map(t => t.toGeneric()), tupleOut: mp._outtuple.toGeneric()});
  }
  return products;
}

${publicFunction('productsOutGb')}(tuple) // TODO: rename this
{
  const mtuple = getMTuple(tuple);
  const products = [];
  for (const mp of mtuple._outproductsgb)
  {
    // TODO additional protection? (freezing, ...)
    products.push({rule:mp.rule, tuples: [...mp.tuples].map(t => t.toGeneric()), value: mtuple.value, groupByOut: {tupleOut: mp._outgb._outtuple.toGeneric()}});
  }
  return products;
}

${publicFunction('productsIn')}(tuple) 
{
  const mtuple = getMTuple(tuple);
  const products = [];
  for (const mp of mtuple.inproducts)
  {
    // TODO additional protection? (freezing, ...)
    products.push({rule:mp.rule, tuples: mp.tuples().map(t => t.toGeneric())});
  }
  return products;
}

`;
}

function emitClear(edbPreds)
{
  const clearers = edbPreds.map(edbPred => `removeTuples(select_${edbPred}());`);

  return `
${publicFunction('clear')}()
{
  ${clearers.join('\n')}
}  
  `;
}

function compileTerm(term)
{
  if (term instanceof Var)
  {
    return term.name;
  }
  if (term instanceof Bin)
  {
    return compileTerm(term.left) + term.operator + compileTerm(term.right);
  }
  throw new Error("compile term error: " + term);
}

function emitEdbAtom(atom, i, rule, producesPred, stratum)
{

  if (atom instanceof Atom)
  {
    const pred = atom.pred;
    if (!stratum.isStratumPredName(atom.pred)) // non-stratum = edb, because of toposort
    {
      if (rule.aggregates())
      {
        return [`
        // atom ${i} ${atom} (edb) (aggregating)
        ${assert(`Array.isArray(${pred}_tuples)`)}
        if (${pred}_tuples.length > 0)
        {
          const [Rule${rule._id}_tuples${i}, tuplesToRemove] = fireRule${rule._id}(${i}, ${pred}_tuples);
          MutableArrays.addAll(${producesPred}_tuples, Rule${rule._id}_tuples${i});  
          const transRemovedTuples = remove_tuples_i(tuplesToRemove);
          MutableSets.addAll(globRemovedTuples, transRemovedTuples);            
        }
      `];  
      }
      return [`
      // atom ${i} ${atom} (edb) (non-aggregating)
      ${assert(`Array.isArray(${pred}_tuples)`)}
      if (${pred}_tuples.length > 0)
      {
        const Rule${rule._id}_tuples${i} = fireRule${rule._id}(${i}, ${pred}_tuples);
        MutableArrays.addAll(${producesPred}_tuples, Rule${rule._id}_tuples${i});  
      }
    `];
    }
  }
  else if (atom instanceof Neg)
  {
    const pred = atom.atom.pred; // always edb
    return [`
    // atom ${i} ${atom} (edb)
    const removed_${pred}_tuples = [...globRemovedTuples].filter(t => t.constructor === ${pred});
    ${assert(`Array.isArray(removed_${pred}_tuples)`)}
    if (removed_${pred}_tuples.length > 0)
    {
      const Rule${rule._id}_tuples${i} = fireRule${rule._id}(${i}, removed_${pred}_tuples);
      MutableArrays.addAll(${producesPred}_tuples, Rule${rule._id}_tuples${i});  
    }
  `];
  }
  return [];
}

function emitDeltaEdbForRule(rule, stratum)
{
  const producesPred = rule.head.pred;
  const atoms = rule.body.flatMap((atom, i) => emitEdbAtom(atom, i, rule, producesPred, stratum));

  return `
    /* Rule${rule._id}
${rule}
    */
    ${atoms.join('\n    ')}
  `;
}

function emitRecursiveRuleAtom(atom, i, recursivePreds, rule, producesPred)
{
  if (atom instanceof Atom)
  {
    const pred = atom.pred;
    if (recursivePreds.has(pred))
    {
      return [`
        const ${producesPred}_tuples_${i} = fireRule${rule._id}(${i}, local_${pred});
        MutableArrays.addAll(new_${producesPred}, ${producesPred}_tuples_${i});
        MutableArrays.addAll(${producesPred}_tuples, ${producesPred}_tuples_${i}); // not reqd for rdb
      `];  
    }
    else
    {
      return [];
    }
  }
  return [];
}

function emitRecursiveRule(rule, recursivePreds)
{
  const producesPred = rule.head.pred;
  const atoms = rule.body.flatMap((atom, i) => emitRecursiveRuleAtom(atom, i, recursivePreds, rule, producesPred));
  return `
    /* Rule${rule._id} [recursive]
${rule}
    */
    ${atoms.join('\n    ')}
  `;
}

function emitRecursiveRules(rules, recursivePreds)
{
  const producedPreds = [...rules.reduce((acc, rule) => acc.add(rule.head.pred), new Set())];

  // TODO these locals profit only in first step from addition that occurs within loop (cascade, through shared ref to general delta set)
  const locals = producedPreds.map(pred => `
    ${assert(`Array.isArray(${pred}_tuples)`)}
    let local_${pred} = ${pred}_tuples;
  `);
  const news = producedPreds.map(pred => `
    const new_${pred} = [];
  `);
  const localConditions = producedPreds.map(pred => `local_${pred}.length > 0`);

  const fireRules = rules.map(rule => emitRecursiveRule(rule, recursivePreds));

  const transfers = producedPreds.map(pred => `
    local_${pred} = new_${pred};
    ${assert(`Array.isArray(local_${pred})`)}
  `);

  return `
    // recursive rules: ${rules.map(rule => "Rule" + rule._id).join(', ')}
    // produce: ${producedPreds}

    ${locals.join('\n')}
    while (${localConditions.join(' || ')})
    {
      ${news.join('\n    ')}
      ${fireRules.join('\n    ')}
  
      ${transfers.join('')}
    }
  `;
}

function termNames(pred)
{
  return Array.from(Array(pred.arity), (_, i) => "t" + i);
}

function termNames2(arity)
{
  return Array.from(Array(arity), (_, i) => "t" + i);
}

function termToString(x)
{
  return String(x); // ???
}


function emitDeltaAddTuple(pred)
{
  const tn = termNames(pred);
  const termProperties = Array.from(Array(pred.arity), (_, i) => `proposed[${i+1}]`);
  return `
function delta_add_${pred}_tuples(proposedEdbTuples)
{
  const ${pred}_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_${pred}(${termProperties.join(', ')});
    if (actual === null)  
    {
      const fresh = add_get_${pred}(${termProperties.join(', ')}); // TODO should be unconditional add
      ${pred}_tuples.push(fresh);
    }
  }
  return ${pred}_tuples;
}
  `
}

function emitAddTuples(strata, preds) 
{

  const deltaAddedTuplesEntries = preds.map(pred => `['${pred}', ${pred}_tuples.map(mt => mt.toGeneric())]`);

  function stratumLogic(stratum)
  {
    const sb = [`${logDebug(`"\\n=======\\nstratum ${stratum}"`)}`];
  
    function removeLoop(pred)
    {
      const tn = termNames(pred);
      const fieldAccesses = tn.map(n => `added_${pred}_tuple.${n}`);
  
      return `
      for (const added_${pred}_tuple of ${pred}_tuples)
      {
        const NOT_${pred}_tuple = get_NOT_${pred}(${fieldAccesses.join()});
        if (NOT_${pred}_tuple !== null)
        {
          tuples_to_remove.push(NOT_${pred}_tuple);
        }
      }`;
    }
  
    if (stratum.negDependsOn.size > 0)
    {
      const removeLoops = [...stratum.negDependsOn].map(removeLoop);
  
      sb.push(`
    // neg deps: ${[...stratum.negDependsOn].join()}
    
    // idb tuple removal due to addition of edb tuples with neg deps
    const tuples_to_remove = [];
    ${removeLoops.join('\n')}
  
    ${logDebug('"\\naddTupleMap: removeTuples " + tuples_to_remove.join()')}
    if (tuples_to_remove.length > 0)
    {
      const transRemovedTuples = remove_tuples_i(tuples_to_remove);
      MutableSets.addAll(globRemovedTuples, transRemovedTuples);
      ${logDebug('`removed due to edb addition: ${[...transRemovedTuples].join()}`')}
    }
      `);
    }
  
    if (stratum.recursiveRules.size === 0 && stratum.nonRecursiveRules.size === 0)
    {
      assertTrue(stratum.preds.length === 1);
      const pred = stratum.preds[0];
      assertTrue(pred.edb);
      return `const ${pred}_tuples = delta_add_${pred}_tuples(edbTuplesMap.get('${pred}') || []);`;
    }
  
    const tupleIntroductions = stratum.preds.map(pred => `const ${pred}_tuples = [];`);
    sb.push(tupleIntroductions.join('\n    '));


     sb.push(`// firing with delta edb tuples`); 
    for (const rule of Sets.union(stratum.nonRecursiveRules, stratum.recursiveRules))
    {
      sb.push(emitDeltaEdbForRule(rule, stratum));
    }
  
    // const nonRecursiveRules = [...stratum.nonRecursiveRules].map(emitNonRecursiveRule);
    // sb.push(nonRecursiveRules.join('\n    '));
  
    sb.push(`// firing with recursive delta idb tuples`); 
    if (stratum.recursiveRules.size > 0)
    {
      const recursiveRules = emitRecursiveRules([...stratum.recursiveRules], new Set(stratum.preds.map(pred => pred.name)));
      sb.push(recursiveRules);
    }
  
    return sb.join('\n');
  }
  
  const strataLogic = strata.map(stratum => {

    return `
    // stratum ${stratum.id}
    // preds: ${stratum.preds.join(', ')}
    // non-recursive rules: ${[...stratum.nonRecursiveRules].map(rule => "Rule" + rule._id)}
    // recursive rules: ${[...stratum.recursiveRules].map(rule => "Rule" + rule._id)}

    ${stratumLogic(stratum)}
  `;
  });

  return `
${publicFunction('addTupleMap')}(edbTuples)
{
  return computeDelta(edbTuples, []);
}

${publicFunction('removeTuples')}(remTuples)
{
  const mremTuples = remTuples.map(getMTuple);
  return computeDelta(new Map(), mremTuples);
} 

function computeDelta(edbTuples, remTuples)
{
  const edbTuplesMap = new Map(edbTuples);
  ${logDebug('"addTupleMap " + [...edbTuplesMap.values()]')}
  const globRemovedTuples = new Set(remove_tuples_i(remTuples));

  ${strataLogic.join('\n')}
  
  return {added: 
    function ()
    {
      return new Map([${[...deltaAddedTuplesEntries]}]);
    }
    , removed: 
    function ()
    {
      return moduleToTupleMap(globRemovedTuples);
    }};}
  `;
}

function emitRemoveTuples()
{
  return `

// only forward (so, in essence, only edb tuples supported) 
function remove_tuples_i(tuples)
{
  ${logDebug('"removeTuples " + tuples')}

  const wl = [...tuples]; // TODO: because this is not a set, same tuples can be scheduled multiple times

  function removeProduct(product)
  {
    ${logDebug('"remove product " + product')}

    for (const intuple of product.tuples())
    {
      intuple._outproducts.delete(product);
      ${logDebug('"deleted " + intuple + " --> " + product')}
      // remember: it's not because a tuple's outproducts is empty,
      // that it cannot in the future play a role in other products 
    }
    const outtuple = product._outtuple;
    outtuple._inproducts.delete(product);
    ${logDebug('"deleted " + product + " --> " + outtuple + " (leaving " + outtuple._inproducts.size + " inproducts)"')}
    if (outtuple._inproducts.size === 0)
    {
      ${logDebug('"scheduled for removal: " + outtuple')}
      wl.push(outtuple);
    }
    else
    {
      ${logDebug('"grounded? " + outtuple')}
      checkGrounded(outtuple);
      // TODO: check for recursive pred/rule (only then a cycle is poss?)
    }
    // product._outtuple = null;
  }

  function checkGrounded(tuple)
  {
    const seen = new Set();

    function groundedTuple(tuple)
    {
      if (tuple._inproducts.size === 0)
      {
        return true;
      }
      if (seen.has(tuple))
      {
        return false;
      }
      seen.add(tuple);
      for (const inproduct of tuple._inproducts)
      {
        if (groundedProduct(inproduct))
        {
          return true;
        }
      }  
      ${logDebug('"no grounded products, not grounded, scheduled for removal: " + tuple')}
      wl.push(tuple);
      return false;
    }

    function groundedProduct(product)
    {
      for (const tuple of product.tuples())
      {
        if (!groundedTuple(tuple))
        {
          // TODO: immediately remove product here?
          return false;
        }
      }
      return true;
    }

    groundedTuple(tuple);
  }

  const removedTuples = new Set();
  while (wl.length > 0)
  {
    const tuple = wl.pop();
    if (removedTuples.has(tuple))
    {
      continue;
    }
    removedTuples.add(tuple);
    ${logDebug('"==\\nremove tuple " + tuple')}
    tuple._remove();
    for (const product of tuple._outproducts)
    {
      removeProduct(product);     
    }
  }

  ${logDebug('`removed ${[...removedTuples].join()}`')}
  return removedTuples;

}`;
}

function emitFirst()
{
  return `

//const IMM_EMPTY_COLLECTION = Object.freeze([]);

const MutableArrays =
{
  addAll(x, y)
  {
    ${assert('Array.isArray(x)', 'x')}
    for (const elem of y)
    {
      x.push(elem);
    }
  }
}

const MutableSets =
{
  addAll(x, y)
  {
    for (const elem of y)
    {
      x.add(elem);
    }
  }
}

const Sets = 
{
  equals(x, y)
  {
    if (x === y)
    {
      return true;
    }
    if (x.size !== y.size)
    {
      return false;
    }
    for (const xvalue of x)
    {
      if (!y.has(xvalue))
      {
        return false;
      }
    }
    return true;
  }
}

function ProductGB(rule, tuples, value)
{
  this.rule = rule;
  this.tuples = tuples;
  this.value = value;
  this._outgb = null;
}
ProductGB.prototype.toString =
  function ()
  {
    return this.rule.name + ":" + [...this.tuples].join('.') + "=" + this.value;
  }

function atomString(predicateName, ...termValues)
{
  return '[' + predicateName + ' ' + termValues.map(termString).join(' ') + ']';
}

function termString(termValue)
{
  if (typeof termValue === "string")
  {
    return "'" + termValue + "'";
  }

  return String(termValue);
}

function genericToTupleMap(genericTuples)
{
  const map = new Map();

  function add(tuple)
  {
    const key = tuple[0];
    const currentValue = map.get(key);
    if (currentValue === undefined)
    {
      map.set(key, [tuple]);
    }
    else
    {
      currentValue.push(tuple);
    }
  }
  [...genericTuples].forEach(add);
  return map;
}

function moduleToTupleMap(mtuples)
{
  const map = new Map();

  function add(mtuple)
  {
    const tuple = mtuple.toGeneric();
    const key = tuple[0];
    const currentValue = map.get(key);
    if (currentValue === undefined)
    {
      map.set(key, tuple);
    }
    else
    {
      currentValue.push(tuple);
    }
  }
  [...mtuples].forEach(add);
  return map;
}

function getMTuple(x)
{
  return (pred2getter.get(x[0]))(...x.slice(1));
}

${publicFunction('addTuples')}(edbTuples)
{
  return addTupleMap(genericToTupleMap(edbTuples));
}
`} // emitFirst

  function emitProfileResults()
  {
    const vars = profileVars.names().map(name => `${name}`);
    return `    
${publicFunction('profileResults')}()
{
  return { ${vars.join()}, ${rules.map(r => `Rule${r._id}:'${r.toString()}'`)} };
}
    `;
  }

  return main();

} // end compile

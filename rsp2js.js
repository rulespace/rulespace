import { MutableArrays, assertTrue } from 'common';
import { Atom, Neg, Agg, Var, Lit } from './rsp.js';
import { analyzeProgram } from './analyzer.js';

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

    for (const functor of analysis.functors())
    {
      sb.push(emitFunctorObject(functor));
    }


    for (const pred of preds)
    {
      sb.push(`
  //////////////////////////////////////////////////
  // ${pred.edb ? 'ebd' : 'idb'} pred ${pred.name}(${pred.arity})
  // precedes: ${[...pred.precedes].join(',')}
  // posDependsOn: ${[...pred.posDependsOn].join(',')}
  // negDependsOn: ${[...pred.negDependsOn].join(',')}
  // posAppearsIn: ${[...pred.posAppearsIn].join(',')}
  // negAppearsIn: ${[...pred.negAppearsIn].join(',')}
      `);

      sb.push(emitTupleObject(pred));
      //sb.push(emitGetTuple(pred));
      if (pred.edb)
      {
        sb.push(emitDeltaAddTuple(pred));
      }
      
      // if (pred.edb)
      // {
      //   sb.push(emitAddTuple(pred, strata));
      // }
      for (const rule of pred.rules)
      {
        sb.push(`/* ${rule} */`);
        if (rule.aggregates())
        {
          sb.push(emitRuleGB(rule));
        }
        else
        {
          sb.push(emitRule(rule));
        }
      }
    }

    const pred2getters = preds.map(pred => `['${pred}', get_${pred}]`);
    sb.push(`const pred2getter = new Map([${pred2getters.join()}])`);
  

  sb.push(emitComputeDelta(strata, preds));
  sb.push(emitRemoveTuples(strata));
  
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
    const sb = [`
function get_${pred}(${tn.join(', ')})
{
    `];
    if (arity === 0)
    {
      sb.push(`return ${pred}_member;`);
    }
    else
    {
      const maps = [`${pred}_members`].concat(Array.from(Array(arity), (_, i) => "l" + i));
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
      sb.push(`return ${maps[arity]};`);
    }
    sb.push(`}`);
    return sb.join('\n');
  }

  function emitAddGet(pred, arity)
  {
    const tn = termNames2(arity);
    const sb = [`
function add_get_${pred}(${tn.join(', ')})
{
    `];

    if (arity === 0)
    {
      sb.push(`
        if (${pred}_member === null)
        {
          ${pred}_member = new ${pred}(${tn.join(', ')});
          ${logDebug(`\`addGet added ${pred}(${tn.map(t => `\${${t}}`)}) to members\``)}
        }
        return ${pred}_member;
        `);
    }
    else
    {
      function emitEntry(i)
      {
        if (i === arity)
        {
          return `tuple`;
        }
        return `new Map([[t${i}, ${emitEntry(i+1)}]])`;
      }
  
      const maps = [`${pred}_members`].concat(Array.from(Array(arity), (_, i) => "l" + i));
      for (let i = 0; i < arity; i++)
      {
        sb.push(`
        const ${maps[i+1]} = ${maps[i]}.get(t${i});
        if (${maps[i+1]} === undefined)
        {
          const tuple = new ${pred}(${tn.join(', ')});
          ${maps[i]}.set(t${i}, ${emitEntry(i+1)});
          ${logDebug(`\`addGet added ${pred}(${tn.map(t => `\${${t}}`)}) to members\``)}
          return tuple;
        }
        `)
      }
      sb.push(`return ${maps[arity]};`)  
    }
    sb.push(`}`);
    return sb.join('\n');
  }

  function emitAddGetExternal(pred, arity)
  {
    const tn = termNames2(arity);
    const sb = [`
function add_get_external_${pred}(tuple)
{
    `];

    if (arity === 0)
    {
      sb.push(`
        if (${pred}_member === null)
        {
          ${pred}_member = tuple;
          ${logDebug(`\`addGet added ${pred}(${tn.map(t => `\${${t}}`)}) to members\``)}
        }
        return ${pred}_member;
        `);
    }
    else
    {
      function emitEntry(i)
      {
        if (i === arity)
        {
          return `tuple`;
        }
        return `new Map([[tuple.t${i}, ${emitEntry(i+1)}]])`;
      }
  
      const maps = [`${pred}_members`].concat(Array.from(Array(arity), (_, i) => "l" + i));
      for (let i = 0; i < arity; i++)
      {
        sb.push(`
        const ${maps[i+1]} = ${maps[i]}.get(tuple.t${i});
        if (${maps[i+1]} === undefined)
        {
          ${maps[i]}.set(tuple.t${i}, ${emitEntry(i+1)});
          ${logDebug(`\`addGet added ${pred}(${tn.map(t => `\${tuple.${t}}`)}) to members\``)}
          return tuple;
        }
        `)
      }
      sb.push(`return ${maps[arity]};`)  
    }
    sb.push(`}`);
    return sb.join('\n');
  }

  // TODO this is the 'generic' tuples-as-map version, yet it doesn't handle 0-arity preds
  function emitAddGet2(name, rootMapName, numFields)
  {
    function emitEntry(i)
    {
      if (i === numFields)
      {
        return `entry`;
      }
      return `new Map([[t${i}, ${emitEntry(i+1)}]])`;
    }

    const tn = termNames2(numFields);
    const maps = [rootMapName].concat(Array.from(Array(numFields), (_, i) => "l" + i));
    const sb = [`
function addGet${name}(${tn.join(', ')})
{
    `];
    for (let i = 0; i < numFields; i++)
    {
      sb.push(`
      const ${maps[i+1]} = ${maps[i]}.get(t${i});
      if (${maps[i+1]} === undefined)
      {
        const entry = new ${name}(${tn.join(', ')});
        ${maps[i]}.set(t${i}, ${emitEntry(i+1)});
        return entry;
      }
      `)
    }
    sb.push(`
    return ${maps[numFields]};
}
    `);
    return sb.join('\n');
  }

  function emitRemove(pred, arity)
  {
    const tn = termNames2(arity);
    const sb = [`
function remove_${pred}(${tn.join(', ')})
{
    `];
    if (arity === 0)
    {
      sb.push(`${pred}_member === null;`);
    }
    else
    {
      const maps = [`${pred}_members`].concat(Array.from(Array(arity), (_, i) => "l" + i));
      for (let i = 0; i < arity-1; i++)
      {
        sb.push(`
        const ${maps[i+1]} = ${maps[i]}.get(t${i});
        `)
      }
      sb.push(`
      ${maps[arity - 1]}.set(t${arity-1}, undefined);`);  
    }
    sb.push(logDebug(`\`removed ${pred}(${tn.map(t => `\${${t}}`)}) from members\``));
    sb.push(`}`);
    return sb.join('\n');
  }

  function emitSelect(pred, arity)
  {
    if (arity === 0)
    {
      // TODO: this returns iterable(?), not iterator (as when arity > 0)
      return `
      function select_${pred}()
      {
          return ${pred}_member === null ? [] : [${pred}_member];
      }
          `;      
    }


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
    
    // iterator
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
  const init = (pred.arity === 0 ? `let ${pred}_member = null` : `const ${pred}_members = new Map()`);

  let sb = `
${init};
${publicFunction(pred)}(${tn.join(', ')})
{
  ${termAssignments.join('\n  ')}
  this._inproducts = ${pred.edb ? `new Set(); //TODO will/should never be added to` : `new Set();`}
  this._outproducts = new Set();
  this._outproductsgb = new Set();
  this._refs = []; // TODO: can statically determine which preds will have refs (i.e., allocated as part of tuple) 
}
// public API (only)
// ${pred}.prototype.get = function () {return get_${pred}(${termFields.join(', ')})};
//
${pred}.prototype.toString = function () {return \`[${pred} ${termFields.map(tf => `\${${tf}}`).join(' ')}]\`};
${pred}.prototype.get = function () { // also internally used
  return get_${pred}(${termFields.join(', ')});
};
${pred}.prototype._remove = function () {
  remove_${pred}(${termFields.join(', ')});
};

${emitGet(`${pred}`, pred.arity)}
${emitAddGet(`${pred}`, pred.arity)}
${emitRemove(`${pred}`, pred.arity)}
${emitSelect(`${pred}`, pred.arity)}


`;

  if (pred.negAppearsIn.size > 0)
  {
    sb += `
const NOT_${pred}_members = new Map();
function NOT_${pred}(${tn.join(', ')})
{
  ${termAssignments.join('\n  ')}  
  this._inproducts = new Set(); // TODO: invariant: no inproducts?
  this._outproducts = new Set();
}        
NOT_${pred}.prototype.toString = function () {return atomString("!${pred}", ${termFields.join(', ')})};  
NOT_${pred}.prototype._remove = function () {
  remove_NOT_${pred}(${termFields.join(', ')});
};


${emitGet(`NOT_${pred}`, pred.arity)}
${emitAddGet(`NOT_${pred}`, pred.arity)}
${emitRemove(`NOT_${pred}`, pred.arity)}
    `;
  }

  return sb;
}

function emitFunctorObject(functor)
{
  const tn = termNames(functor);
  const termAssignments = tn.map(t => `this.${t} = ${t};`);
  const termFields = tn.map(t => `this.${t}`);
  const termEqualities = tn.map(t => `Object.is(member.${t}, ${t})`);
  const init = (functor.arity === 0 ? `let ${functor}_member = null` : `const ${functor}_members = new Map()`);

  let sb = `
${init};
${publicFunction(functor)}(${tn.join(', ')})
{
  ${termAssignments.join('\n  ')}
  this._rc = 0;
  this._outproducts = new Set();
  this._outproductsgb = new Set();
  this._refs = [];
}
${functor}.prototype.toString = function () {return atomString("${functor}", ${termFields.join(', ')})};
${functor}.prototype._remove = function () {
  remove_${functor}(${termFields.join(', ')});
};

${emitGet(`${functor}`, functor.arity)}
${emitAddGet(`${functor}`, functor.arity)}
${emitRemove(`${functor}`, functor.arity)}
`;

  return sb;
}


function compileMatchFunctor(functor, target, compileEnv, bindUnboundVars, conditions)
{
  conditions.push(`${target} instanceof ${functor.pred}`);
  functor.terms.forEach((term, i) => // TODO cloned from compileAtom
  {
    if (term instanceof Var)
    {
      if (term.name !== '_')
      {
        if (compileEnv.has(term.name))
        {
          conditions.push(`${target}.t${i} === ${term.name}`);
        }
        else
        {
          bindUnboundVars.push(`const ${term.name} = ${target}.t${i};`);
          compileEnv.add(term.name);
        }  
      }
    }
    else if (term instanceof Lit)
    {
      conditions.push(`${target}.t${i} === ${termToString(term.value)}`);
    }
    else if (term instanceof Atom)
    {
      compileMatchFunctor(term, `${target}.t${i}`, compileEnv, bindUnboundVars, condition);
    }
    else
    {
      throw new Error("cannot handle " + term);
    }
  })
}


function compileAtom(atom, target, compileEnv, bindUnboundVars, conditions)
{
  atom.terms.forEach((term, i) =>
  {
    if (term instanceof Var)
    {
      if (term.name !== '_')
      {
        if (compileEnv.has(term.name))
        {
          conditions.push(`${target}.t${i} === ${term.name}`);
        }
        else
        {
          bindUnboundVars.push(`const ${term.name} = ${target}.t${i};`);
          compileEnv.add(term.name);
        }  
      }
    }
    else if (term instanceof Lit)
    {
      conditions.push(`${target}.t${i} === ${termToString(term.value)}`);
    }
    else if (term instanceof Atom) // functor
    {
      compileMatchFunctor(term, `${target}.t${i}`, compileEnv, bindUnboundVars, conditions);
    }
    else
    {
      throw new Error("cannot handle " + term);
    }
  })
}


function compileCreateFunctor(functor, j, compileEnv, termExpsOut, rcIncs)
{
  termExpsOut.push(`functor${j}`);
  rcIncs.push(`functor${j}`);
  const termExps = functor.terms;
  return `
      // functor ${functor}
      const functor${j} = add_get_${functor.pred}(${termExps.join(', ')});
  `;
}

function compileRuleFireBody(rule, head, body, i, compileEnv, ptuples, rcIncs)
{
  if (i === body.length)
  {
    const pred = head.pred;
    const t2ps = ptuples.map(tuple => `${tuple}._outproducts.add(product);`);
    const noRecursionConditions = ptuples.map(tuple => `${tuple} !== existing_${pred}_tuple`);
    const termExps = [];
    const termAids = [];

    head.terms.map((term, j) =>
    {
      if (term instanceof Var)
      {
        termExps.push(term);
      }
      else if (term instanceof Atom) // Functor
      {
        termAids.push(compileCreateFunctor(term, j, compileEnv, termExps, rcIncs));
      }
      else if (term instanceof Lit)
      {
        termExps.push(term);
      }
      else
      {
        throw new Error(`cannot handle term ${term}`);
      }
    })


    return `
      // adding ${head}
      ${termAids}
      const existing_${pred}_tuple = get_${pred}(${termExps.join(', ')});
      if (existing_${pred}_tuple === null)
      {
        const new_${pred}_tuple = add_get_${pred}(${termExps.join(', ')});
        newTuples.add(new_${pred}_tuple);
        const product = addGetRule${rule._id}Product(${ptuples.join(', ')});
        ${t2ps.join('\n        ')}
        product._outtuple = new_${pred}_tuple;
        new_${pred}_tuple._inproducts.add(product);
        ${rcIncs.map(x => `new_${pred}_tuple._refs.push(${x})`).join('\n        ')}
        ${rcIncs.map(x => `${x}._rc++;`).join('\n        ')}
      }
      else if (${noRecursionConditions.join(' && ')}) // remove direct recursion
      {
        const product = addGetRule${rule._id}Product(${ptuples.join(', ')});
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
    
    compileAtom(atom, tuple, compileEnv, bindUnboundVars, conditions);

    if (conditions.length === 0)
    {
      return `
      // atom ${atom} (no conditions)
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : select_${pred}()))
      {
        ${bindUnboundVars.join('\n        ')}
        ${compileRuleFireBody(rule, head, body, i+1, compileEnv, ptuples, rcIncs)}
      }
      `;  
    }
    else
    {
      return `
      // atom ${atom} (conditions)
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : select_${pred}()))
      {
        if (${conditions.join(' && ')})
        {
          ${bindUnboundVars.join('\n          ')}
          ${compileRuleFireBody(rule, head, body, i+1, compileEnv, ptuples, rcIncs)}
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
    ${compileRuleFireBody(rule, head, body, i+1, compileEnv, ptuples, rcIncs)}
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

      ${compileRuleFireBody(rule, head, body, i+1, compileEnv, ptuples, rcIncs)}
    `;
  }

  throw new Error(body[i]);
}

function emitRule(rule)
{
  const compileEnv = new Set();

  const tupleArity = rule.tupleArity();
  const tupleParams = Array.from({length:tupleArity}, (_, i) => `tuple${i}`);
  const tupleFieldInits = Array.from(tupleParams, tp => `this.${tp} = ${tp};`);
  const tupleFields = Array.from(tupleParams, tp => `this.${tp}`);
  const recursive = analysis.ruleIsRecursive(rule);

  return `
/* rule (tuple arity ${tupleArity}) (${recursive ? 'recursive' : 'non-recursive'} (non-aggregating)
${rule} 
*/

class Rule${rule._id}Product
{
  constructor(${tupleParams.join(', ')})
  {
    ${tupleFieldInits.join('\n')}
    this._outtuple = null; // TODO make this ctr param!
  }

  // result of a recursive rule?
  recursive()
  {
    return ${recursive};
  }

  tuples() // or, a field initialized in ctr?
  {
    return [${tupleFields.join(', ')}];
  }

  toString()
  {
    return "r${rule._id}:" + this.tuples().join('.');
  }
}

const Rule${rule._id}Products = new Map();
${emitAddGet2(`Rule${rule._id}Product`, `Rule${rule._id}Products`, tupleArity)}
// TODO: Product removal!

function fireRule${rule._id}(deltaPos, deltaTuples)
{
  ${logDebug(`"fire ${rule}"`)}
  ${logDebug('`deltaPos ${deltaPos} deltaTuples ${[...deltaTuples].join()}`')}

  ${profileStart(`fireRule${rule._id}`)}

  const newTuples = new Set();

  ${compileRuleFireBody(rule, rule.head, rule.body, 0, compileEnv, [], [])}

  ${profileEnd(`fireRule${rule._id}`)}

  ${logDebug('`=> newTuples ${[...newTuples].join()}`')}

  return newTuples;
} // end fireRule${rule._id}
  `;
}

function compileRuleGBFireBody(rule, head, body, i, compileEnv, ptuples) // TODO contains cloned code from `compileRule`
{
  if (i === body.length)
  {
    const agg = head.terms[head.terms.length - 1];
    assertTrue(agg instanceof Agg);
    const aggregate = agg.aggregate;
    const gb = head.terms.slice(0, head.terms.length - 1);
    const t2ps = ptuples.map(tuple => `${tuple}._outproductsgb.add(productGB);`);
    return `
      // updates for ${head}
      const productGB = addGetRule${rule._id}ProductGB(${ptuples.join()});
      const groupby = add_get_Rule${rule._id}GB(${gb.join()});

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        productGB.value = ${aggregate}; // TODO: aggregate is func dep on tuples, arrange this in another way (e.g. set in ctr)?
        productGB._outgb = groupby;
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [${aggregate}]);
        }
        else
        {
          currentAdditionalValues.push(${aggregate});
        }
        ${t2ps.join('\n        ')}
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

function emitRuleGB(rule)
{
  const tupleArity = rule.tupleArity();
  const tupleParams = Array.from({length:tupleArity}, (_, i) => `tuple${i}`);
  const tupleFieldInits = Array.from(tupleParams, tp => `this.${tp} = ${tp};`);
  const tupleFields = Array.from(tupleParams, tp => `this.${tp}`);

  const pred = rule.head.pred;
  const compileEnv = new Set();

  const numGbTerms = rule.head.terms.length - 1;
  const tn = Array.from(Array(numGbTerms), (_, i) => "t" + i);
  const termAssignments = tn.map(t => `this.${t} = ${t}`);
  const termToStrings = tn.map(t => `this.${t}`);
  const aggTerm = rule.head.terms[rule.head.terms.length - 1];


  const recursive = analysis.ruleIsRecursive(rule);
  assertTrue(!recursive);

  return `
/* rule (tuple arity ${tupleArity}) (non-recursive) (aggregating) 
${rule} 
*/

class Rule${rule._id}GB
{
  constructor(${tn.join(', ')})
  {
    ${termAssignments.join('; ')};
    this._outtuple = null;  
  }

  toString()
  {
    return atomString('${rule.head.pred}', ${termToStrings.join(', ')}, ({toString: () => "${aggTerm}"}));
  }
}

const Rule${rule._id}GB_members = new Map();
${emitAddGet(`Rule${rule._id}GB`, numGbTerms)}

class Rule${rule._id}ProductGB
{
  constructor(${tupleParams.join(', ')})
  {
    ${tupleFieldInits.join('\n    ')}
    this.value = null; // TODO ctr param? (is func dep on tuples + complicates addGet)
    this._outgb = null;  // TODO ctr param? (complicates addGet)
  }

  tuples() // or, a field initialized in ctr?
  {
    return [${tupleFields.join(', ')}];
  }

  toString()
  {
    return "r${rule._id}:" + this.tuples().join('.');
  }
}

const Rule${rule._id}ProductGBs = new Map();
${emitAddGet2(`Rule${rule._id}ProductGB`, `Rule${rule._id}ProductGBs`, tupleArity)}
// TODO: Product removal!

function fireRule${rule._id}GB(deltaPos, deltaTuples, updates)
{
  ${logDebug(`"fire ${rule}"`)}
  ${logDebug('`deltaPos ${deltaPos} deltaTuples ${[...deltaTuples].join()}`')}

  ${profileStart(`fireRule${rule._id}GB`)}

  const newTuples = new Set();

  ${compileRuleGBFireBody(rule, rule.head, rule.body, 0, compileEnv, [])}
  
  ${profileEnd(`fireRule${rule._id}GB`)}

  ${logDebug('`=> current updates: ${[...updates.entries()].join(", ")}`')}
} // end fireRule${rule._id}GB
  `;
}

function emitIterators(preds, edbPreds, rules)
{
  const tupleYielders = preds.map(pred => `yield* select_${pred}()`);
  const edbTupleYielders = edbPreds.map(pred => `yield* select_${pred}()`);
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

function compileTerm(term) // TODO term compiling is already present elsewhere
// make distinction between head terms and body terms!
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
        if (added_${pred}_tuples.length > 0)
        {
          fireRule${rule._id}GB(${i}, added_${pred}_tuples, updates${rule._id});
        }
      `];  
      }
      return [`
      // atom ${i} ${atom} (edb) (non-aggregating)
      if (added_${pred}_tuples.length > 0)
      {
        const Rule${rule._id}_tuples${i} = fireRule${rule._id}(${i}, added_${pred}_tuples);
        MutableArrays.addAll(added_${producesPred}_tuples, Rule${rule._id}_tuples${i});  
      }
    `];
    }
  }
  else if (atom instanceof Neg)
  {
    const pred = atom.atom.pred; // always stratum-edb
    return [`
    // atom ${i} ${atom} (edb)
    if (removed_${pred}_tuples.length > 0)
    {
      const Rule${rule._id}_tuples${i} = fireRule${rule._id}(${i}, removed_${pred}_tuples); // TODO inefficient: does full scan in lrnu
      MutableArrays.addAll(added_${producesPred}_tuples, Rule${rule._id}_tuples${i});  
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
    /* Rule${rule._id} (non-aggregating)
${rule}
    */
    ${atoms.join('\n    ')}
  `;
}

function emitDeltaEdbForAggregatingRule(rule, stratum)
{
  const pred = rule.head.pred;
  const atoms = rule.body.flatMap((atom, i) => emitEdbAtom(atom, i, rule, pred, stratum));
  const gbNames = Array.from({length: rule.head.terms.length - 1}, (_, i) => "groupby.t"+i);

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

  return `
    /* Rule${rule._id} (aggregating)
${rule}
    */

    const updates${rule._id} = new Map(); // groupby -> additional values

    ${atoms.join('\n    ')}

    // bind head ${rule.head}
    for (const [groupby, additionalValues] of updates${rule._id})
    {
      ${logDebug('`update: gb ${groupby} additional vals ${additionalValues}`')}
      const currentResultTuple = groupby._outtuple;
      ${logDebug('`currentResultTuple ${currentResultTuple}`')}
      const updatedValue = ${updateOperation};
      const updatedResultTuple = add_get_${pred}(${gbNames.join()}, updatedValue);  
      ${logDebug('`updatedResultTuple ${updatedResultTuple}`')}
      if (groupby._outtuple !== updatedResultTuple)
      {
        if (groupby._outtuple !== null)
        { 
          deltaRemove_${pred}(groupby._outtuple);
        }
        groupby._outtuple = updatedResultTuple;
        updatedResultTuple.ingb = groupby;
        added_${pred}_tuples.push(updatedResultTuple);
      }
    }
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
        const ${producesPred}_tuples_${i} = fireRule${rule._id}(${i}, local_${pred}_tuples);
        MutableArrays.addAll(new_${producesPred}_tuples, ${producesPred}_tuples_${i});
        MutableArrays.addAll(added_${producesPred}_tuples, ${producesPred}_tuples_${i}); // not reqd for rdb
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
    let local_${pred}_tuples = added_${pred}_tuples;
  `);
  const news = producedPreds.map(pred => `
    const new_${pred}_tuples = [];
  `);
  const localConditions = producedPreds.map(pred => `local_${pred}_tuples.length > 0`);

  const fireRules = rules.map(rule => emitRecursiveRule(rule, recursivePreds));

  const transfers = producedPreds.map(pred => `
    local_${pred}_tuples = new_${pred}_tuples;
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
  if (typeof x === 'string')
  {
    return `'${x}'`;
  }
  return String(x); // ???
}


function emitDeltaAddTuple(pred)
{
  const tn = termNames(pred);
  const termProperties = Array.from(Array(pred.arity), (_, i) => `proposed.t${i+1}`);
  return `

${emitAddGetExternal(pred, pred.arity)}
function delta_add_${pred}_tuples(proposedEdbTuples)
{
  const ${pred}_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = add_get_external_${pred}(proposed);
    if (actual === proposed) // freshly added
    {
      ${pred}_tuples.push(actual);
    }
  }
  return ${pred}_tuples;
}
  `
}

function stratumLogic(stratum)
{
  const globalEdbStratum = (stratum.recursiveRules.size === 0 && stratum.nonRecursiveRules.size === 0);

  const sb = [`
    ${logDebug(`"=== stratum ${stratum}"`)}
    // stratum ${stratum.id} ${globalEdbStratum ? `(global edb)` : `(global idb)`}
    // preds: ${stratum.preds.join(', ')}
    // non-recursive rules: ${[...stratum.nonRecursiveRules].map(rule => "Rule" + rule._id)}
    // recursive rules: ${[...stratum.recursiveRules].map(rule => "Rule" + rule._id)}  
    `];


  if (globalEdbStratum)
  {
    for (const pred of stratum.preds)
    {
      assertTrue(pred.edb);
      sb.push(emitDeltaRemoveTuple(pred));
      if (pred.negAppearsIn.size > 0)
      {
        sb.push(emitDeltaRemoveTuple(`NOT_${pred}`));
      }

      sb.push(`

      // removing ${pred} tuples because of user delta
      const ${pred}_tuples_to_be_removed = (removedTuplesMap.get(${pred}) || []);
      for (const ${pred}_tuple of ${pred}_tuples_to_be_removed)
      {
        deltaRemove_${pred}(${pred}_tuple);
      }
      
      // adding ${pred} tuples because of user delta
      const added_${pred}_tuples = delta_add_${pred}_tuples(addedTuplesMap.get(${pred}) || []);
      `);  
    }      
  }
  else // global idb stratum
  {

    if (analysis.stratumHasRecursiveRule(stratum))
    {
      assertTrue(stratum.preds.every(pred => analysis.predHasRecursiveRule(pred)));

      if (stratum.preds.length > 1)
      {
        const removeLoopCondition = stratum.preds.map(pred => `damaged_${pred}_tuples.length > 0`).join(' || ');
        sb.push(`
        while (${removeLoopCondition})
        {`);  
      }

      for (const pred of stratum.preds)
      {
        const removalCondition = analysis.predHasNonRecursiveRule
          ? `damaged_${pred}_tuple._inproducts.size === 0 || !tupleIsGrounded(damaged_${pred}_tuple)`
          : `damaged_${pred}_tuple._inproducts.size === 0)`; // a "fully recursive" never by itself will have incoming non-recursive products,
          // so its groundedness always depends on other tuples (with incoming non-rec products)
        sb.push(`
        ${logDebug(`\`removing \${damaged_${pred}_tuples.length} damaged ${pred} tuples due to removal of other tuples\``)}
        while (damaged_${pred}_tuples.length > 0)
        {
          const damaged_${pred}_tuple = damaged_${pred}_tuples.pop();
          if (${removalCondition})
          {
            deltaRemove_${pred}(damaged_${pred}_tuple);
          }  
        }
        `)
      }

      if (stratum.preds.length > 1)
      {
        sb.push(`
        }`)
      }
    }
    else // single-pred non-recursive stratum
    {
      assertTrue(stratum.preds.length === 1);
      const pred = stratum.preds[0];
      sb.push(`
      ${logDebug(`"removing damaged ${pred} tuples due to removal of stratum-edb tuples"`)}
      for (const damaged_${pred}_tuple of damaged_${pred}_tuples)
      {
        if (damaged_${pred}_tuple._inproducts.size === 0)
        {
          deltaRemove_${pred}(damaged_${pred}_tuple);
        }
      }
      `);
    }
     
    for (const pred of stratum.preds)
    {
      sb.push(`const added_${pred}_tuples = [];`);
      sb.push(logDebug('"adding idb tuples due to stratum-edb addition by firing non-recursive rules"')); 
      for (const rule of pred.rules)
      {
        if (rule.aggregates())
        {
          sb.push(emitDeltaEdbForAggregatingRule(rule, stratum));
        }
        else
        {
          sb.push(emitDeltaEdbForRule(rule, stratum));
        }
      }
    }
  
    if (stratum.recursiveRules.size > 0)
    {
      sb.push(logDebug('"adding idb tuples due to stratum-idb addition by firing recursive rules"')); 
      const recursiveRules = emitRecursiveRules([...stratum.recursiveRules], new Set(stratum.preds.map(pred => pred.name)));
      sb.push(recursiveRules);
    }

    for (const pred of stratum.preds)
    {
      sb.push(emitDeltaRemoveTuple(pred));
      if (pred.negAppearsIn.size > 0)
      {
        sb.push(emitDeltaRemoveNOTTuple(pred));

        const tn = termNames(pred);
        const fieldAccesses = tn.map(n => `added_${pred}_tuple.${n}`);    
        sb.push(`
        ${logDebug(`"removing idb tuples due to addition of ${pred} tuples"`)}
        for (const added_${pred}_tuple of added_${pred}_tuples)
        {
          const NOT_${pred}_tuple = get_NOT_${pred}(${fieldAccesses.join()});
          if (NOT_${pred}_tuple !== null)
          {
            deltaRemove_NOT_${pred}(NOT_${pred}_tuple);
          }
        }
        `);
      }
    }
    
  }

  return sb.join('\n');
}

function emitDeltaRemoveTuple(pred)
{
  const tns = termNames(pred);
  const rules = [...pred.posAppearsIn];
  const productRemoval = rules.map(r => `
        // rule ${r}
        if (outproduct instanceof Rule${r._id}Product)
        {
          ${Array.from({length:r.tupleArity()}, (_, i) => 
            `outproduct.tuple${i}._outproducts.delete(outproduct);`).join('\n            ')}
          const ${r.head.pred}_tuple = outproduct._outtuple;
          ${r.head.pred}_tuple._inproducts.delete(outproduct);
          damaged_${r.head.pred}_tuples.push(${r.head.pred}_tuple);
        }
  `);

  return `
  function deltaRemove_${pred}(${pred}_tuple)
  {
    remove_${pred}(${tns.map(tn => `${pred}_tuple.${tn}`).join(', ')});
    removed_${pred}_tuples.push(${pred}_tuple);
    for (const outproduct of ${pred}_tuple._outproducts)
    {
      ${productRemoval.join('  else')}
    }
    const refs = ${pred}_tuple._refs; // TODO check this statically (compile away when possible)
    if (refs.length > 0) 
    {
      for (let i = 0; i < refs.length; i++)
      {
        const rc = --refs[i]._rc;
        if (rc === 0)
        {
          refs[i]._remove();
        }
      }
    }
  }`;
}

function emitDeltaRemoveNOTTuple(pred)
{
  const tns = termNames(pred);
  const rules = [...pred.negAppearsIn];
  const productRemoval = rules.map(r => `
        // rule ${r}
        if (outproduct instanceof Rule${r._id}Product)
        {
          ${Array.from({length:r.tupleArity()}, (_, i) => 
            `outproduct.tuple${i}._outproducts.delete(outproduct);`).join('\n            ')}
          const ${r.head.pred}_tuple = outproduct._outtuple;
          ${r.head.pred}_tuple._inproducts.delete(outproduct);
          damaged_${r.head.pred}_tuples.push(${r.head.pred}_tuple);
        }
  `);

  return `
  function deltaRemove_NOT_${pred}(NOT_${pred}_tuple)
  {
    remove_NOT_${pred}(${tns.map(tn => `NOT_${pred}_tuple.${tn}`).join(', ')});
    // removed_NOT_${pred}_tuples.push(NOT_${pred}_tuple); // TODO is this ever used?
    for (const outproduct of NOT_${pred}_tuple._outproducts)
    {
      ${productRemoval.join('  else')}
    }
  }`;
}

function emitComputeDelta(strata, preds) 
{
  const deltaAddedTuplesEntries = preds.map(pred => `['${pred}', added_${pred}_tuples]`);
  const deltaRemovedTuplesEntries = preds.map(pred => `['${pred}', removed_${pred}_tuples]`);

  return `
function computeDelta(addTuples, remTuples)
{
  const addedTuplesMap = new Map(addTuples);
  const removedTuplesMap = new Map(remTuples);
  ${logDebug('"addedTupleMap " + [...addedTuplesMap.values()]')}
  ${logDebug('"removedTupleMap " + [...removedTuplesMap.values()]')}

  ${preds
    .filter(pred => !pred.edb) 
    .map(pred => `const damaged_${pred}_tuples = [];`)
    .join('\n  ')
  }

  ${preds
    .map(pred => `const removed_${pred}_tuples = [];`)
    .join('\n  ')
  }


  ${strata.map(stratumLogic).join('\n')}
  
  ${logDebug('"=== done"')}
  return {
    added() {return [${[...deltaAddedTuplesEntries]}]},
    removed() {return [${[...deltaRemovedTuplesEntries]}]}
    }
} // computeDelta
`;
}

function emitRemoveTuples(strata)
{
  return `
function tupleIsGrounded(tuple)
{
  const seen = new Set();

  function groundedTuple(tuple)
  {
    if (seen.has(tuple))
    {
      ${logDebug('`${tuple} not grounded: cycle`')}
      return false;
    }
    seen.add(tuple);
    if (tuple._inproducts.size === 0)
    {
      ${logDebug('`${tuple} grounded: no inproducts`')}
      return true;
    }
    for (const inproduct of tuple._inproducts)
    {
      if (!inproduct.recursive())
      {
        // known to be grounded because of incoming product from lower stratum
        ${logDebug('`${tuple} grounded because of non-recursive product ${inproduct}`')}
        return true;
      }
      if (groundedProduct(inproduct))
      {
        ${logDebug('`${tuple} grounded because of product ${inproduct}`')}
        return true;
      }
    }  
    ${logDebug('`${tuple} not grounded: has no grounded products`')}
    return false;
  }

  function groundedProduct(product)
  {
    for (const tuple of product.tuples())
    {
      if (!groundedTuple(tuple))
      {
        return false;
      }
    }
    return true;
  }

  const isGrounded = groundedTuple(tuple);
  ${logDebug('`${tuple} is ${isGrounded ? "" : "not "}grounded`')}
  return isGrounded;
}
`;
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


function toTupleMap(tuples)
{
  const map = new Map();

  function add(tuple)
  {
    const key = tuple.constructor;
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
  [...tuples].forEach(add);
  return map;
}

${publicFunction('addTupleMap')}(addTuples)
{
  return computeDelta(addTuples, []);
}

${publicFunction('addTuples')}(edbTuples)
{
  return addTupleMap(toTupleMap(edbTuples));
}

${publicFunction('getTuple')}(tuple)
{
  return tuple.get();
}

${publicFunction('removeTupleMap')}(remTuples)
{
  return computeDelta([], remTuples);
} 

${publicFunction('removeTuples')}(edbTuples)
{
  return removeTupleMap(toTupleMap(edbTuples));
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

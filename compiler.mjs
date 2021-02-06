import { assertTrue } from './common.mjs';
import { SchemeParser  } from './parser.mjs';
import { analyzeProgram, Atom, Var, Lit, Neg, Agg } from './analyzer.mjs';


export function compile(src, options={})
{
  const parser = new SchemeParser();
  const program = parser.parse(src);

  const analysis = analyzeProgram(program);
  const strata = analysis.strata;
  const preds = analysis.preds;
  const edbPreds = preds.filter(pred => pred.edb);
  const rules = analysis.program.rules;

  const OPT_module = options.module === true ? true : false;
  const FLAG_compile_to_module = OPT_module;
  const FLAG_compile_to_ctr = !OPT_module;
  const FLAG_debug = options.debug === true ? true : false;
  
  const publicFunctions = [];

  const emitters =
  {
    publicFunction(name)
    {
      publicFunctions.push(name);
      return `${FLAG_compile_to_module ? 'export ' : ''}function ${name}`;
    },
    publicFunctionStar(name)
    {
      publicFunctions.push(name);
      return `${FLAG_compile_to_module ? 'export ' : ''}function* ${name}`;
    },
    logDebug(str)
    {
      return FLAG_debug ? `console.log(${str})` : ``;
    }
  }

  const sb = [];

  if (FLAG_compile_to_ctr)
  {
    sb.push(`"use strict";`);
  }

  sb.push(emitFirst(emitters));

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

    sb.push(emitTupleObject(pred, emitters));
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
        sb.push(emitRuleObject(rule, emitters));
      }
    }
  }
  
//   for (const stratum of strata)
//   {
//     sb.push(`
// //////////////////////////////////////////////////
// // stratum ${stratum.id}
// // preds: ${stratum.preds.join(', ')}
//     `);
//   }

  // for (const negatedPred of staticInfo.negatedPreds)
  // {
  //   const arity = staticInfo.pred2arity.get(negatedPred);
  //   sb.push(emitTupleObject("NOT_" + negatedPred, arity));
  // }


  sb.push(emitAddTuples(strata, emitters));
  sb.push(emitRemoveTuples(emitters));
  sb.push(emitPutBackTuples(strata, emitters));
  
  sb.push(emitIterators(preds, edbPreds, rules, emitters));
  sb.push(emitClear(edbPreds, emitters));

  sb.push(emitRest);

  if (FLAG_compile_to_ctr)
  {
    sb.push(`return {${publicFunctions.join(', ')}};`);
  }

  return sb.join('\n');
}


function emitTupleObject(pred, emitters)
{
  const tn = termNames(pred);
  const termAssignments = tn.map(t => `this.${t} = ${t};`);
  const termFields = tn.map(t => `this.${t}`);
  const termEqualities = tn.map(t => `Object.is(member.${t}, ${t})`);


  let sb = `
const ${pred}_members = new Set();
${emitters.publicFunction(pred)}(${tn.join(', ')})
{
  ${termAssignments.join('\n  ')}
  this._inproducts = ${pred.edb ? `new Set(); //TODO will/should never be added to` : `new Set();`}
  this._outproducts = new Set();
  this._outproductsgb = new Set();
}
// public API (only)
${pred}.prototype.get = function () {return get_${pred}(${termFields.join(', ')})};
//
${pred}.prototype.toString = function () {return atomString("${pred}", ${termFields.join(', ')})};
${pred}.prototype._remove = function () {${pred}_members.delete(this)};

function get_${pred}(${tn.join(', ')})
{
  for (const member of ${pred}_members)
  {
    if (${termEqualities.join(' && ')})
    {
      return member;
    }
  }
  return null;
}
`;

  if (pred.negated)
  {
    sb += `
const NOT_${pred}_members = new Set();
function NOT_${pred}(${tn.join(', ')})
{
  ${termAssignments.join('\n  ')}  
  this._inproducts = new Set(); // TODO: invariant: no inproducts?
  this._outproducts = new Set();
}        
NOT_${pred}.prototype.toString = function () {return atomString("!${pred}", ${termFields.join(', ')})};  
NOT_${pred}.prototype._remove = function () {NOT_${pred}_members.delete(this)};

function get_NOT_${pred}(${tn.join(', ')})
{
  for (const member of NOT_${pred}_members)
  {
    if (${termEqualities.join(' && ')})
    {
      return member;
    }
  }
  return null;
}


function get_or_create_NOT_${pred}(${tn.join(', ')})
{
  for (const member of NOT_${pred}_members)
  {
    if (${termEqualities.join(' && ')})
    {
      return member;
    }
  }
  const tuple = new NOT_${pred}(${tn.join(', ')});
  NOT_${pred}_members.add(tuple);
  return tuple;
}
    `;
  }

  return sb;
}


// function emitGetTuple(pred)
// {
//   const arity = pred.arity;

//   const tn = termNames(pred);
//   const termEqualities = tn.map(t => `Object.is(member.${t}, ${t})`);
//   return `
// export function get_${pred}_tuple(${tn.join(', ')})
// {
//   for (const member of ${pred}_members)
//   {
//     if (${termEqualities.join(' && ')})
//     {
//       return member;
//     }
//   }
//   return null;
// }
//   `
// }

function emitAssertTrue(condition)
{
  return `assertTrue(${condition})`;
}

function compileRuleFireBody(ruleName, head, body, i, compileEnv, ptuples)
{
  if (i === body.length)
  {
    const pred = head.pred;
    const t2ps = ptuples.map(tuple => `${tuple}._outproducts.add(product);`);
    const noRecursionConditions = ptuples.map(tuple => `${tuple} !== existing_${pred}_tuple`);
    return `
      // updates for ${head}
      const ptuples = new Set([${ptuples.join(', ')}]);
      const existing_${pred}_tuple = get_${pred}(${head.terms.join(', ')});
      if (existing_${pred}_tuple === null)
      {
        const new_${pred}_tuple = new ${pred}(${head.terms.join(', ')});
        newTuples.add(new_${pred}_tuple);
        ${pred}_members.add(new_${pred}_tuple);
        const product = new Product(${ruleName}, ptuples);
        ${t2ps.join('\n        ')}
        product._outtuple = new_${pred}_tuple;
        new_${pred}_tuple._inproducts.add(product);
      }
      else if (${noRecursionConditions.join(' && ')}) // remove direct recursion
      {
        const product = new Product(${ruleName}, ptuples);
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
        throw new Error();
      }
    });

    if (conditions.length === 0)
    {
      return `
      // atom ${atom} [no conditions]
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : ${pred}_members))
      {
        ${bindUnboundVars.join('\n        ')}
        ${compileRuleFireBody(ruleName, head, body, i+1, compileEnv, ptuples)}
      }
      `;  
    }
    else
    {
      return `
      // atom ${atom} [conditions]
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : ${pred}_members))
      {
        if (${conditions.join(' && ')})
        {
          ${bindUnboundVars.join('\n       ')}
          ${compileRuleFireBody(ruleName, head, body, i+1, compileEnv, ptuples)}
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
    const conditions = [];
    natom.terms.forEach((term, i) => {
      if (term instanceof Var)
      {
        if (compileEnv.has(term.name))
        {
          conditions.push(`${tuple}.t${i} === ${term.name}`);
        }
        else
        {
          // bindUnboundVars.push(`const ${term.name} = ${tuple}.t${i};`);
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
      throw new Error("TODO");
    }
    else
    {
      return `
      // atom ${atom} [conditions]
      let found${i} = false;
      for (const ${tuple} of ${pred}_members)
      {
        if (${conditions.join(' && ')})
        {
          found${i} = true; // TODO solve with continue;
          break;
        }
      }
      if (found${i})
      {
        continue;
      }
      const NOT_${tuple} = get_or_create_NOT_${pred}(${natom.terms.join(', ')}); // TODO: not added to members
      ${compileRuleFireBody(ruleName, head, body, i+1, compileEnv, ptuples)}
      `;  
    }
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

      ${compileRuleFireBody(ruleName, head, body, i+1, compileEnv, ptuples)}
    `;
  }

  throw new Error(body[i]);
}

// (Reachable x y) :- (Reachable x z) (Link z y)
function emitRuleObject(rule, emitters)
{
  const ruleName = "Rule" + rule._id;
  const compileEnv = new Set();

  return `
/* rule [no aggregates] 
${rule} 
*/
// const ${ruleName}_products = new Set();

const ${ruleName} =
{
  name : '${ruleName}',

  fire(deltaPos, deltaTuples) // TODO: make this fire_xxx function
  {
    ${emitters.logDebug(`"fire ${rule}"`)}
    ${emitters.logDebug('`deltaPos ${deltaPos}`')}
    ${emitters.logDebug('`deltaTuples ${[...deltaTuples].join()}`')}
    const newTuples = new Set();

    ${compileRuleFireBody(ruleName, rule.head, rule.body, 0, compileEnv, [])}

    ${emitters.logDebug('`=> newTuples ${[...newTuples].join()}`')}
    return newTuples;
  }
} // end ${ruleName}

  `;
}



function compileRuleGBFireBody(ruleName, head, body, i, compileEnv, ptuples)
{
  if (i === body.length)
  {
    const agg = head.terms[head.terms.length - 1];
    assertTrue(agg instanceof Agg);
    const aggregand = agg.aggregand;
    const gb = head.terms.slice(0, head.terms.length - 1);
    return `
      // updates for ${head}
      const ptuples = new Set([${ptuples.join()}]);
      const productGB = new ProductGB(${ruleName}, ptuples, ${aggregand});
      const groupby = get_or_create_${ruleName}GB(${gb.join()});

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [${aggregand}]);
        }
        else
        {
          currentAdditionalValues.push(${aggregand});
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
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : ${pred}_members))
      {
        ${bindUnboundVars.join('\n        ')}
        ${compileRuleGBFireBody(ruleName, head, body, i+1, compileEnv, ptuples)}
      }
      `;  
    }
    else
    {
      return `
      // atom ${atom} [conditions]
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : ${pred}_members))
      {
        if (${conditions.join('&&')})
        {
          ${bindUnboundVars.join('\n        ')}
          ${compileRuleGBFireBody(ruleName, head, body, i+1, compileEnv, ptuples)}
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

      ${compileRuleGBFireBody(ruleName, head, body, i+1, compileEnv, ptuples)}
    `;
  }

  throw new Error(body[i]);
}

// (R x sum<z>) :- (X x) (I x y), z = y*y 
function emitRuleGBObject(rule)
{
  const pred = rule.head.pred;
  const ruleName = "Rule" + rule._id;
  const compileEnv = new Set();
  const gbNames = Array.from(Array(rule.head.terms.length - 1), (_, i) => "groupby.t"+i);
  const aggregandName ="t" + (rule.head.terms.length - 1);

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
    updateOperation = `currentResultTuple === null ? additionalValues.reduce((acc, val) => ${joinOperation}) : additionalValues.reduce((acc, val) => ${joinOperation}, currentResultTuple.${aggregandName})`
  }
  else if (addOperation)
  {
    updateOperation = `currentResultTuple === null ? additionalValues.reduce((acc, val) => ${addOperation}, ${identityValue}) : additionalValues.reduce((acc, val) => ${joinOperation}, currentResultTuple.${aggregandName})`
  }
  else
  {
    throw new Error("No update operation for aggregator: " + aggregator)
  }

  const GBclass = emitRuleGBClass(rule, ruleName);

  return `
/* rule [aggregates] 
${rule} 
*/
const ${ruleName} =
{
  name : '${ruleName}',

  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();
    const updates = new Map(); // groupby -> additionalValues

    ${compileRuleGBFireBody(ruleName, rule.head, rule.body, 0, compileEnv, [])}
    
    // bind head ${rule.head}
    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple;
      const updatedValue = ${updateOperation};
      const updatedResultTuple = new ${pred}(${gbNames.join()}, updatedValue);  
      if (groupby._outtuple !== updatedResultTuple)
      {
        groupby._outtuple = updatedResultTuple;
        newTuples.add(updatedResultTuple);
        ${pred}_members.add(updatedResultTuple);
      }
    }
    return newTuples;
  }
} // end ${ruleName}

${GBclass}

  `;
}

function emitRuleGBClass(rule, ruleName)
{
  const numGbTerms = rule.head.terms.length - 1;
  const tn = Array.from(Array(numGbTerms), (_, i) => "t" + i);
  const termEqualities = tn.map(t => `Object.is(member.${t}, ${t})`);
  const termAssignments = tn.map(t => `this.${t} = ${t}`);
  const termToStrings = tn.map(t => `this.${t}`);
  const aggTerm = rule.head.terms[rule.head.terms.length - 1];
  return `
const ${ruleName}GB_members = new Set();
function ${ruleName}GB(${tn.join(', ')})
{
  ${termAssignments.join('; ')};
  this._outtuple = null;
}
${ruleName}GB.prototype.toString = function () { return atomString('${rule.head.pred}', ${termToStrings.join(', ')}, ({toString: () => "${aggTerm}"})) };
${ruleName}GB.prototype.rule = function () { return ${ruleName}};

function get_or_create_${ruleName}GB(${tn.join(', ')})
{
  for (const member of ${ruleName}GB_members)
  {
    if (${termEqualities.join(' && ')})
    {
      return member;
    }
  }
  const gb = new ${ruleName}GB(${tn.join(', ')});
  ${ruleName}GB_members.add(gb);
  return gb;
}
  `;
}

function emitIterators(preds, edbPreds, rules, emitters)
{
  const tupleYielders = preds.map(pred => `yield* ${pred}_members;`);
  const edbTupleYielders = edbPreds.map(pred => `yield* ${pred}_members;`);
  const gbYielders = rules.flatMap((rule, i) => rule.aggregates() ? [`//yield* Rule${rule._id}GB.members;`] : []);
  const ruleNames = rules.map(rule => `Rule${rule._id}`);

  return `
// from membership
${emitters.publicFunctionStar('tuples')}() 
{
  ${tupleYielders.join('\n  ')}
}

${emitters.publicFunctionStar('edbTuples')}() 
{
  ${edbTupleYielders.join('\n  ')}
}

// function* groupbys()
// {
     ${gbYielders.join('\n  ')}
// }  

// function rules()
// {
//   return [${ruleNames.join(', ')}];
// }
  `;
}

function emitClear(edbPreds, emitters)
{
  const clearers = edbPreds.map(edbPred => `remove_tuples(${edbPred}_members);`);

  return `
${emitters.publicFunction('clear')}()
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


function emitNonRecursiveRuleAtom(atom, i, ruleName, producesPred)
{

  if (atom instanceof Atom)
  {
    const pred = atom.pred;
    return [`
      // atom ${i} ${atom}
      const ${ruleName}_tuples${i} = ${ruleName}.fire(${i}, ${pred}_tuples);
      MutableSets.addAll(${producesPred}_tuples, ${ruleName}_tuples${i});
    `];
  }
  return [];
}

function emitNonRecursiveRule(rule)
{
  const ruleName = "Rule" + rule._id;
  const producesPred = rule.head.pred;
  const atoms = rule.body.flatMap((atom, i) => emitNonRecursiveRuleAtom(atom, i, ruleName, producesPred));

  return `
    /* ${ruleName} [nonRecursive]
${rule}
    */
    ${atoms.join('\n    ')}
  `;
}

function emitRecursiveRuleAtom(atom, i, recursivePreds, ruleName, producesPred)
{
  if (atom instanceof Atom)
  {
    const pred = atom.pred;
    if (recursivePreds.has(pred))
    {
      return [`
        // atom ${i} ${atom} (recursive)
        //if (local_${pred}.size > 0)
        //{
          const ${producesPred}_tuples_${i} = ${ruleName}.fire(${i}, local_${pred});
          MutableSets.addAll(new_${producesPred}, ${producesPred}_tuples_${i});
          MutableSets.addAll(${producesPred}_tuples, ${producesPred}_tuples_${i}); // not reqd for rdb
        //}    
      `];  
    }
    else
    {
      return [`
        // atom ${i} ${atom} (non-recursive)
        const ${producesPred}_tuples_${i} = ${ruleName}.fire(${i}, ${pred}_tuples);
        MutableSets.addAll(new_${producesPred}, ${producesPred}_tuples_${i});
        MutableSets.addAll(${producesPred}_tuples, ${producesPred}_tuples_${i}); // not reqd for rdb
      `];        
    }
  }
  return [];
}

function emitRecursiveRule(rule, recursivePreds)
{
  const ruleName = "Rule" + rule._id;
  const producesPred = rule.head.pred;
  const atoms = rule.body.flatMap((atom, i) => emitRecursiveRuleAtom(atom, i, recursivePreds, ruleName, producesPred));
  return `
    /* ${ruleName} [recursive]
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
    let local_${pred} = ${pred}_tuples;
  `);
  const news = producedPreds.map(pred => `
    const new_${pred} = new Set();
  `);
  const localConditions = producedPreds.map(pred => `local_${pred}.size > 0`);

  const fireRules = rules.map(rule => emitRecursiveRule(rule, recursivePreds));

  const transfers = producedPreds.map(pred => `
    local_${pred} = new_${pred};
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

function termToString(x)
{
  return String(x); // ???
}


function emitDeltaAddTuple(pred)
{
  const tn = termNames(pred);
  const termProperties = tn.map(t => `proposed.${t}`);
  return `
function delta_add_${pred}_tuples(proposedEdbTuples)
{
  const ${pred}_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_${pred}(${termProperties.join(', ')});
    if (actual === null)  
    {
      ${pred}_tuples.push(proposed);
      ${pred}_members.add(proposed);
    }
  }
  return ${pred}_tuples;
}
  `
}

function emitAddTuples(strata, emitters) 
{

  function stratumLogic(stratum)
  {
    const sb = [`${emitters.logDebug(`"\\n=======\\nstratum ${stratum}"`)}`];
  
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
  
    ${emitters.logDebug('"* add_tuple_map: remove " + tuples_to_remove.join()')}
    if (tuples_to_remove.length > 0)
    {
      remove_tuples(tuples_to_remove);
    }
      `);
    }
  
    if (stratum.recursiveRules.size === 0 && stratum.nonRecursiveRules.size === 0)
    {
      assertTrue(stratum.preds.length === 1);
      const pred = stratum.preds[0];
      assertTrue(pred.edb);
      return `const ${pred}_tuples = delta_add_${pred}_tuples(edbTuplesMap.get(${pred}) || new Set());`;
    }
  
    const tupleIntroductions = stratum.preds.map(pred => `const ${pred}_tuples = new Set();`);
    sb.push(tupleIntroductions.join('\n    '));
  
    const nonRecursiveRules = [...stratum.nonRecursiveRules].map(emitNonRecursiveRule);
    sb.push(nonRecursiveRules.join('\n    '));
  
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
${emitters.publicFunction('add_tuple_map')}(edbTuples)
{
  const edbTuplesMap = new Map(edbTuples);
  ${emitters.logDebug('"add_tuple_map " + [...edbTuplesMap.values()]')}
  ${strataLogic.join('\n')}
  return null; 
}
  `;
}

function emitPutBackTuples(strata, emitters)
{

  function stratumLogic(stratum)
  {
    for (const [pred, negDeps] of stratum.pred2negDeps)
    {
      for (const {rule, i} of negDeps)
      {
        return `
        // pred: ${pred}
        // rule: ${rule}
        // atom pos: ${i} 
  
        const Rule${rule._id}_tuples${i} = Rule${rule._id}.fire(${i}, tuples.get(${pred}));
        MutableSets.addAll(addedTuples, Rule${rule._id}_tuples${i});
        `  
      }
    }
  }

  const strataLogic = strata.map(stratum => {

    return `
    // stratum ${stratum.id}
    // neg deps: ${[...stratum.pred2negDeps.keys()].join()}

    ${stratumLogic(stratum)}
  `;
  });

  return `
function put_back_tuple_map(tuples)
{
  const tuplesMap = new Map(tuples);
  ${emitters.logDebug('"put_back_tuple_map " + [...tuplesMap.values()]')}
  const addedTuples = new Set();
  ${strataLogic.join('\n')}
  ${emitters.logDebug('"* put_back_tuple_map: add_tuples " + [...addedTuples].join()')}
  if (addedTuples.size > 0)
  {
    return add_tuple_map(toTupleMap(addedTuples)); // TODO should be tupleMap 
  }
} // put_back
  `;  
}

function emitRemoveTuples(emitters)
{
  return `

// only forward (so, in essence, only edb tuples supported) 
${emitters.publicFunction('remove_tuples')}(tuples)
{
  ${emitters.logDebug('"remove_tuples " + tuples')}

  const wl = [...tuples]; // TODO: because this is not a set, same tuples can be scheduled multiple times

  function removeProduct(product)
  {
    ${emitters.logDebug('"remove product " + product')}

    for (const intuple of product.tuples)
    {
      intuple._outproducts.delete(product);
      ${emitters.logDebug('"deleted " + intuple + " --> " + product')}
      // remember: it's not because a tuple's outproducts is empty,
      // that it cannot in the future play a role in other products 
    }
    const outtuple = product._outtuple;
    outtuple._inproducts.delete(product);
    ${emitters.logDebug('"deleted " + product + " --> " + outtuple + " (leaving " + outtuple._inproducts.size + " inproducts)"')}
    if (outtuple._inproducts.size === 0)
    {
      ${emitters.logDebug('"scheduled for removal: " + outtuple')}
      wl.push(outtuple);
    }
    else
    {
      ${emitters.logDebug('"grounded? " + outtuple')}
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
      ${emitters.logDebug('"no grounded products, not grounded, scheduled for removal: " + tuple')}
      wl.push(tuple);
      return false;
    }

    function groundedProduct(product)
    {
      for (const tuple of product.tuples)
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
    ${emitters.logDebug('"==\\nremove tuple " + tuple')}
    tuple._remove();
    for (const product of tuple._outproducts)
    {
      removeProduct(product);     
    }
  }

  ${emitters.logDebug('"* remove_tuples: put back " + [...removedTuples].join()')}
  if (removedTuples.size > 0)
  {
    put_back_tuple_map(toTupleMap(removedTuples));
  }
}`;
}

function emitFirst(emitters)
{
  return `

//const IMM_EMPTY_COLLECTION = Object.freeze([]);

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

function Product(rule, tuples)
{
  this.rule = rule;
  this.tuples = tuples;
  this._outtuple = null;
  // for (const existingP of products)
  // {
  //   if (existingP.equals(this))
  //   {
  //     console.log("existing product created: " + this);
  //     return this;
  //   }
  // }
  // console.log("fresh product created: " + this);
  // products.push(this);
  // return this;
}
Product.prototype.toString =
  function ()
  {
    return this.rule.name + ":" + [...this.tuples].join('.');
  }
Product.prototype.equals =
  function (x)
  {
    if (this.rule !== x.rule)
    {
      return false;
    }
    return Sets.equals(this.tuples, x.tuples);
  }

function ProductGB(rule, tuples, value)
{
  this.rule = rule;
  this.tuples = tuples;
  this.value = value;
  this._outtuple = null;
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

${emitters.publicFunction('add_tuples')}(edbTuples)
{
  return add_tuple_map(toTupleMap(edbTuples));
}
`} // emitFirst

const emitRest = `
`;


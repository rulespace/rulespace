import fs from 'fs';
import { assertTrue } from './common.mjs';
import { SchemeParser  } from './parser.mjs';
import { analyzeProgram, Atom, Var, Lit, Neg, Agg } from './analyzer.mjs';

export function compileFile(name)
{
  const compiled = compile(fs.readFileSync(`${name}.sl`, 'utf8'));
  fs.writeFileSync(`${name}.mjs`, compiled, 'utf8');
}

export function compile(src)
{
  const parser = new SchemeParser();
  const program = parser.parse(src);

  const analysis = analyzeProgram(program);
  const strata = analysis.strata;
  const preds = analysis.preds;
  const edbPreds = preds.filter(pred => pred.edb);
  const rules = analysis.program.rules;

  const sb = [];

  sb.push(emitImports);
  sb.push(emitFirst);

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
        sb.push(emitRuleObject(rule));
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


  sb.push(emitAddTuples(strata));
  sb.push(emitRemoveTuples);
  
  sb.push(emitIterators(preds, edbPreds, rules));
  sb.push(emitClear(edbPreds));

  sb.push(emitRest);

  return sb.join('\n');
}

const emitFirst = `

const IMM_EMPTY_COLLECTION = Object.freeze([]);

`;


function emitTupleObject(pred)
{
  const tn = termNames(pred);
  const termAssignments = tn.map(t => `this.${t} = ${t};`);
  const termFields = tn.map(t => `this.${t}`);
  const termEqualities = tn.map(t => `Object.is(member.${t}, ${t})`);


  let sb = `
const ${pred}_members = new Set();
export function ${pred}(${tn.join(', ')})
{
  ${termAssignments.join('\n  ')}
  this._inproducts = ${pred.edb ? `IMM_EMPTY_COLLECTION` : `new Set()`};
  this._outproducts = new Set();
  this._outproductsgb = new Set();
}
${pred}.prototype.toString = function () {return atomString("${pred}", ${termFields.join(', ')})};  
${pred}.prototype.get = function () {return get_${pred}(${termFields.join(', ')})};  // public API only 
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
export function NOT_${pred}(${tn.join(', ')})
{
  ${termAssignments.join('\n  ')}  
  this._outproducts = new Set();
}        
NOT_${pred}.prototype.toString = function () {return atomString("!${pred}", ${termFields.join(', ')})};  
NOT_${pred}.prototype._remove = function () {NOT_${pred}_members.delete(this)};

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
      else
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
function emitRuleObject(rule)
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
    const newTuples = new Set();

    ${compileRuleFireBody(ruleName, rule.head, rule.body, 0, compileEnv, [])}

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

function emitIterators(preds, edbPreds, rules)
{
  const tupleYielders = preds.map(pred => `yield* ${pred}_members;`);
  const edbTupleYielders = edbPreds.map(pred => `yield* ${pred}_members;`);
  const gbYielders = rules.flatMap((rule, i) => rule.aggregates() ? [`yield* Rule${rule._id}GB.members;`] : []);
  const ruleNames = rules.map(rule => `Rule${rule._id}`);

  return `
// from membership
export function* tuples() 
{
  ${tupleYielders.join('\n  ')}
}

export function* edbTuples() 
{
  ${edbTupleYielders.join('\n  ')}
}

function* groupbys()
{
  ${gbYielders.join('\n  ')}
}  

// function rules()
// {
//   return [${ruleNames.join(', ')}];
// }
  `;
}

function emitClear(edbPreds)
{
  const clearers = edbPreds.map(edbPred => `remove_tuples(${edbPred}_members);`);

  return `
export function clear()
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


const emitImports = `import {
  MutableSets,
  Product, ProductGB,
  atomString,
} from './schemelog-common.mjs';
`;

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
        // atom ${i} ${atom}
        if (local_${pred}.size > 0)
        {
          const ${producesPred}_tuples_${i} = ${ruleName}.fire(${i}, local_${pred});
          MutableSets.addAll(new_${producesPred}, ${producesPred}_tuples_${i});
          MutableSets.addAll(${producesPred}_tuples, ${producesPred}_tuples_${i}); // not reqd for rdb
        }    
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

function stratumLogic(stratum)
{
  const sb = [];
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

function emitAddTuples(strata) 
{

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
export function add_tuples(edbTuples)
{
  const edbTuplesMap = new Map(edbTuples);
  ${strataLogic.join('\n')}
  return null; 
}
  `;
}

const emitRemoveTuples = `
// only forward (so, in essence, only edb tuples supported) 
export function remove_tuples(tuples)
{
  const wl = [...tuples];

  function removeProduct(product)
  {
    for (const intuple of product.tuples)
    {
      intuple._outproducts.delete(product);
      // remember: it's not because a tuple's outproducts is empty,
      // that it cannot in the future play a role in other products 
    }
    const outtuple = product._outtuple;
    outtuple._inproducts.delete(product);
    if (outtuple._inproducts.size === 0)
    {
      wl.push(outtuple);
    }
    // product._outtuple = null;
  }

  while (wl.length > 0)
  {
    const tuple = wl.pop();
    tuple._remove();
    for (const product of tuple._outproducts)
    {
      removeProduct(product);     
    }
  }
}
`;


const emitRest = `
`;


// const result = compileFile("example1");
// console.log(String(result));
// console.log("done");


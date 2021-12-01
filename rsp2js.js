import { Arrays, assertTrue, Sets } from '@rulespace/common';
import { Atom, Neg, Agg, Var, Lit, Assign, App, Lam } from './rsp.js';
import { analyzeProgram, freeVariables } from './analyzer.js';
import { 
  RelationEmitter0, RelationEmitter, 
  FunctorEmitter0, FunctorEmitter,
  ClosureEmitter0, ClosureEmitter, 
  GroupByEmitter0, GroupByEmitter, 
  ProductEmitter, NestedMapsProductEmitter,
  ProductGBEmitter, 
  NestedMapsRelationEmitter
} from './rsp2js-emitters.js';
import * as Constraints from './constrainer.js';

class RspJsCompilationError extends Error
{
  constructor(msg)
  {
    super(msg);
    this.name = 'RspJsCompilationError';
  }
}

let freshCounter = 0;
function freshVariable(str) 
{
  let sb = "";
  for (const c of str)
  {
    switch (c)
    {
      case "‘":
        sb += "_primeo_"; break;
      case "’":
        sb += "_prime_"; break;
      case "“":
        sb += "_dprimeo_"; break; 
      case "”":
        sb += "_dprime_"; break; 
      case "«":
        sb += "_openg_"; break; 
      case "»":
        sb += "_closeg_"; break; 
      case "…":
        sb += "_ellp_"; break;
      case "?":
        sb += "_qm_"; break;
      case "+":
        sb += "_plus_"; break;
      case "-":
        sb += "_minus_"; break;
      case "*":
        sb += "_star_"; break;
      case "/":
        sb += "_slash_"; break;
      case "=":
        sb += "_eq_"; break;
      case "<":
        sb += "_lt_"; break;
      case ">":
        sb += "_gt_"; break;
      default:
        sb += c;
   }
  }
  sb += String(freshCounter++);
  return sb;
}

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

class Lines
{
  constructor()
  {
    this.lines = [];
  }

  add(line)
  {
    this.lines.push(line);
  }

  toString()
  {
    return this.lines.join('\n');
  }
}

// when used as first-class values (else, they are directly compiled)
const nativeFuns = new Map([
  ['+', (...args) => args.reduce((acc, x) => acc + x)],
  ['-', (...args) => args.reduce((acc, x) => acc - x)],
  ['*', (...args) => args.reduce((acc, x) => acc * x)],
  ['<', (...args) => args.slice(1).every(x => args[0] < x)],
  ['>', (...args) => args.slice(1).every(x => args[0] > x)],
  ['<=', (...args) => args.slice(1).every(x => args[0] <= x)],
  ['>=', (...args) => args.slice(1).every(x => args[0] >= x)],
  ['=', (...args) => args.slice(1).every(x => args[0] === x)],
  ['not', arg => !arg],
  ['even?', arg => arg % 2 === 0],
  ['odd?', arg => arg % 2 === 1]
]);

const nativeFunNames = [...nativeFuns.keys()];
const nativeFunCompiledNames = nativeFunNames.map(freshVariable);

function isNativeFunName(x)
{
  return nativeFunNames.includes(x);
}

class RequiredBuiltInFuns
{
  constructor()
  {
    this.set = new Set();
  }

  add(name)
  {
    this.set.add(name);
    return nativeFunCompiledNames[nativeFunNames.indexOf(name)];
  }

  toString()
  {
    return [...this.set].map(name => `const ${nativeFunCompiledNames[nativeFunNames.indexOf(name)]} = ${nativeFuns.get(name)}; // ${name}`).join('\n');
  }
}
const requiredBuiltInFunDefs = new RequiredBuiltInFuns();

// TODO: move to analysis
function cyclicNegations(analysis)
{
  const result = [];
  const strata = analysis.strata();
  for (const stratum of strata)
  {
    const stratumPreds = analysis.stratumPreds(stratum);
    for (const pred of stratumPreds)
    {
      for (const stratumRule of analysis.predRules(pred))
      {
        for (const atom of stratumRule.body)
        {
          if (atom instanceof Neg)
          {
            const posAtom = atom.atom;
            const negatedPred = analysis.name2pred.get(posAtom.pred);
            if (stratumPreds.includes(negatedPred))
            {
              // throw new RspJsCompilationError(`unable to stratify program: cyclic negation of predicate ${negatedPred} in ${stratumRule}\n(stratum predicates: ${stratum.preds.join()})`);
              result.push({negatedPred, stratumRule, stratum});
            }
          }
        }  
      }
    }
  }
  return result;
}

export function rsp2js(rsp, options={})
{
  const analysis = analyzeProgram(rsp);
  const strata = analysis.strata();
  const preds = analysis.preds;

  const cns = cyclicNegations(analysis);
  if (cns.length > 0)
  {
    throw new RspJsCompilationError(`unable to stratify program: cyclic negations: ${cns.map(cn => `\npredicate ${cn.negatedPred} in ${cn.stratumRule}\n(stratum predicates: ${cn.stratum.preds.join()})`)}`);
  }


  const edbPreds = preds.filter(pred => pred.edb);
  const rules = analysis.program.rules;


  const constraints = Constraints.computeConstraints(rsp);
  // const indexes = Constraints.computeIndexes(constraints);
  const indexes = null;

  // options + emitters
  const OPT_module = options.module === true ? true : false;
  const FLAG_compile_to_module = OPT_module;
  const FLAG_compile_to_ctr = !OPT_module;
  const publicFunctions = [];
  const publicFunction = name => { publicFunctions.push(name); return `${FLAG_compile_to_module ? 'export ' : ''}function ${name}`};
  // const publicFunctionStar = name => { publicFunctions.push(name); return `${FLAG_compile_to_module ? 'export ' : ''}function* ${name}`};

  
  const FLAG_debug = options.debug ?? false;
  const logDebug = FLAG_debug ? str => `console.debug(${str})` : () => ``;

  const FLAG_info = options.info ?? true;
  const logInfo = FLAG_info ? str => `console.info(${str})` : () => ``;

  const FLAG_profile = options.profile ?? false;
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

  const FLAG_assertions = options.assertions ?? false;
  const assert = FLAG_assertions
    ? (condition, display='"(?)"', explanation='assertion failed') => `if (!(${condition})) {throw new Error(${display} + ': ${explanation}')} ` 
    : () => ``;
  // end options + emitters

  const lambdas = new Lines();


////////////

function addAllTuples(targetArray, x)
{
  return `MutableArrays.addAll(${targetArray}, ${x});`
}

function fireRuleInto(rule, deltaPos, deltaTuples, into)
{
  assertTrue(!rule.aggregates());
  return `const ${into} = fireRule${rule._id}(${deltaPos}, ${deltaTuples})`
}

function checkRuleProductsEmpty(rule)
{
  return `is_empty_Rule${rule._id}()`;
}

///

function createRelationEmitter(name, arity)
{
  if (arity === 0)
  {
    return new RelationEmitter0(name, publicFunction, logDebug);
  }
  // return new RelationEmitter(name, arity, publicFunction, logDebug);
  return new NestedMapsRelationEmitter(name, arity, publicFunction, logDebug);
}

function createFunctorEmitter(name, arity, publicFunction, logDebug)
{
  if (arity === 0)
  {
    return new FunctorEmitter0(name, publicFunction, logDebug);
  }
  return new FunctorEmitter(name, arity, publicFunction, logDebug);
}

function createClosureEmitter(name, arity)
{
  if (arity === 0)
  {
    return new ClosureEmitter0(name, logDebug);
  }
  return new ClosureEmitter(name, arity, logDebug);
}

function createGroupByEmitter(name, arity, logDebug)
{
  if (arity === 0)
  {
    return new GroupByEmitter0(name, logDebug);
  }
  return new GroupByEmitter(name, arity, logDebug);
}

function createProductEmitter(name, arity, recursive, logDebug)
{
  // return new ProductEmitter(name, arity, recursive, logDebug);
  return new NestedMapsProductEmitter(name, arity, recursive, logDebug);
}

function createProductGBEmitter(name, arity, logDebug)
{
  return new ProductGBEmitter(name, arity, logDebug);
}



const relationEmitters = new Map(analysis.preds.map(pred => [pred, createRelationEmitter(pred.name, pred.arity)]));


// function getPred(pred, values)
// {
//   return relationTce.get(pred, values);
// }

// function addGetPred(pred, values)
// {
//   return relationTce.addGet(pred, values);
// }

function selectPred(pred)
{
  return `relation_${pred}.select()`;
}

// function removePred(pred, values)
// {
//   return relationTce.remove(pred, values);
// }

function countPred(pred)
{
  return `relation_${pred}.count()`;
}


function countClosure(closure)
{
  return `relation_${closure}.count()`;
}

function countProd(rule)
{
  if (rule.tupleArity() === 0)
  {
    return `0`;
  }
  return `product${rule.aggregates() ? 'GB' : ''}_Rule${rule._id}.count()`;
}

function outProductsPred(pred, tupleExp) // returns Set
{
  return relationEmitters.get(pred).outProducts(tupleExp);
}

function addOutProductPred(pred, tupleExp, productExp)
{
  return relationEmitters.get(pred).addOutProduct(tupleExp, productExp);
}

function addGetProd(name, tuples)
{
  return `product_${name}.addGet(${tuples})`;
}

function addProd(name, prodExp)
{
  return `product_${name}.add(${prodExp})`;
}

function getProd(name, tupleExps)
{
  return `product_${name}.get(${tupleExps})`;
}

function addGetProdGB(name, tuples)
{
  return `productGB_${name}.addGet(${tuples})`;
}

function addGetGroupBy(name, valueExps)
{
  return `groupby_${name}.addGet(${valueExps.join()})`;
}


////////////

function main()
{
  const sb = [profileVars, requiredBuiltInFunDefs, lambdas, `
  
  ${FLAG_compile_to_ctr ? `"use strict"` : ``}
  ${FLAG_compile_to_module && FLAG_profile ? `import { performance } from 'perf_hooks'` : ``}
  ${FLAG_profile ? `console.log("profiling on")` : ``}
  ${FLAG_assertions ? logInfo(`'assertions on'`) : ``}

  /*
  ${constraints}

  ${indexes}
  */

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

  // we first emit rules because part of the analysis happens here (needed
  // for emitting selectors); TODO: factor this out! 
  ${preds.map(pred => `
  //////////////////////////////////////////////////
  // rules for ${pred.edb ? 'ebd' : 'idb'} pred ${pred.name}(${pred.arity})

  ${pred.rules.map(rule => `
    /* ${rule} */
    ${rule.aggregates() ? emitRuleGB(rule) : emitRule(rule)}
        `).join('\n')}
      `).join('\n')}    

  // now emitting the objects:
  
  ${analysis.functors().map(emitFunctorObject).join('\n')}
  
  ${preds.map(pred => `
    //////////////////////////////////////////////////
    // ${pred.edb ? 'ebd' : 'idb'} pred ${pred.name}(${pred.arity})
    // precedes: ${[...pred.precedes].join(',')}
    // posDependsOn: ${[...pred.posDependsOn].join(',')}
    // negDependsOn: ${[...pred.negDependsOn].join(',')}
    // posAppearsIn: ${[...pred.posAppearsIn].join(',')}
    // negAppearsIn: ${[...pred.negAppearsIn].join(',')}

    ${emitTupleObject(pred)}
    ${pred.edb ? emitDeltaAddEdbTuple(pred) : ''}
  `).join('\n')}

  // (1) even without initial facts, certain rules must be triggered, e.g. (rule [R] (not [Some-Edb]))
  // if there is no (remove) delta on Some-Edb, then R will not be added
  // therefore, strategy: treat all initial (facts+derived) tuples as delta additions and fire
  // all rules once without specific deltas
  // Note that the example rule is an edge case: only when the NegAtom does not contain variables,
  // then you can have the situation that you need to add idb tuples without being triggered by edb additions.
  // (2) the reason that computeInitialAdd takes the initial facts, is because (only!) when there are no tuples,
  // computeInitialAdd can also be used when initially adding facts externally (i.e., through computeDelta)
  // (3) although (1) is an edge case, it may still prove to be more optimal (faster) to have add-only logic
  ${logDebug('"computing initial idb tuples due to addition of fact edbs"')}; 
  computeInitialAdd() // TODO return delta is not used!
  ${emitComputeInitialAdd(strata, preds)}
  ${emitComputeDelta(strata, preds)}
  ${emitIsGrounded(strata)}
  ${emitIterators(preds, edbPreds, rules)}
  ${emitClear(edbPreds)}
  ${emitCount(preds, analysis.functors(), [...syntacticLambdas.values()])}

  ${publicFunction('toTupleMap')}(tuples)
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

  // "slow" functions, only for external usage
  ${publicFunction('outProducts')}(x)
  {
    if (x._outproducts)
    {
      return [...x._outproducts];
    }
    return [];
  }

  ${publicFunction('outProductsGroupBy')}(x)
  {
    if (x._outproductsgb)
    {
      return [...x._outproductsgb];
    }
    return [];
  }

  ${publicFunction('inProducts')}(x)
  {
    if (x._inproducts)
    {
      return [...x._inproducts];
    }
    return [];
  }

  ${publicFunction('outTuple')}(x)
  {
    if (x._outtuple)
    {
      return x._outtuple;
    }
    return null;
  }

  ${publicFunction('outGroupBy')}(x)
  {
    if (x._outgb)
    {
      return x._outgb;
    }
    return null;
  }

  ${FLAG_profile ? emitProfileResults() : ``}
  ${FLAG_compile_to_ctr ? `return {${publicFunctions.join(', ')}};` : ``}
  // the end`];

  return sb.join('\n');
} // main

function emitTupleObject(pred)
{
  const arity = pred.arity;
  const relationEmitter = relationEmitters.get(pred);
  
  let sb = `
    ${relationEmitter.objectDeclaration()}
    ${relationEmitter.containerDeclaration(indexes ? (indexes.p2i.get(pred.name) ?? []) : [])}
    const relation_${pred} = ${relationEmitter.instantiate()}
  `;

  if (pred.negAppearsIn.size > 0)
  {
    const negPredName = `NOT_${pred}`;
    const negRelationEmitter = createRelationEmitter(negPredName, arity);
    relationEmitters.set(negPredName, negRelationEmitter); // TODO need to move
    sb += `
    ${negRelationEmitter.objectDeclaration()}
    ${negRelationEmitter.containerDeclaration([])} // TODO indexes for neg preds?
    const relation_${negPredName} = ${negRelationEmitter.instantiate()}
    `
  }

  return sb;
}

function emitFunctorObject(functor)
{
  const arity = functor.arity;
  const functorEmitter = createFunctorEmitter(functor.name, arity, publicFunction, logDebug);

  return  `
  ${functorEmitter.objectDeclaration()};
  ${functorEmitter.containerDeclaration()}
  const functor_${functor} = ${functorEmitter.instantiate()}
  `;
}

function compileConstraintElement(el, tuple, compileEnv)
{
  if (el instanceof Constraints.CPos)
  {
    return `${tuple}.${el.indices.map(i => `t${i}`).join('.')}`;
  }
  else if (el instanceof Constraints.CVar)
  {
    return compileEnv.get(el.name);
  }
  else if (el instanceof Constraints.CLit)
  {
    return termToString(el.value);
  }
  else if (el instanceof Constraints.CPred)
  {
    return el.pred;
  }
  else
  {
    throw new Error(`cannot handle constraint element ${el} of type ${el?.constructor?.name}`);
  }
}

function compilePrimitiveSearchFor(tuple, compileEnv)
{
  return function (constraint)
  {
    if (constraint instanceof Constraints.EqConstraint)
    {
      const left = compileConstraintElement(constraint.left, tuple, compileEnv);
      const right = compileConstraintElement(constraint.right, tuple, compileEnv);
      return `${left} === ${right}`;
    }
    else if (constraint instanceof Constraints.ElementOfConstraint)
    {
      const left = compileConstraintElement(constraint.left, tuple, compileEnv);
      if (!(constraint.right instanceof Constraints.CPred))
      {
        throw new Error(`assertion failed: ${constraint.right} instanceof ${constraint?.right?.constructor?.name} and not Pred`);
      }
      const right = compileConstraintElement(constraint.right, tuple, compileEnv);
      return `${left} instanceof ${right}`;
    }
    else
    {
      throw new Error(`cannot handle constraint ${constraint} of type ${constraint?.constructor?.name}`);
    }
  };
}

function compileAtom(atom, i, rule, compileEnv, ptuples, rcIncs, cont)
{
  const tuple = "tuple" + i;
  ptuples.push(tuple);
  const pred = atom.pred;
  const atomBindings = constraints.atomBindings(atom);
  const atomConstraints = constraints.atomConstraints(atom);
  const atomResidualConstraints = indexes ? indexes.a2rc.get(atom) : atomConstraints;
  const postFilterBindings = [];
  for (const [name, constraintValue] of atomBindings)
  {
    const varName = freshVariable(name);
    compileEnv.set(name, varName);
    postFilterBindings.push(`const ${varName} = ${compileConstraintElement(constraintValue, tuple, compileEnv)};`);
  }

  const allConditions = atomConstraints.map(compilePrimitiveSearchFor(tuple, compileEnv));
  const residualConditions = atomResidualConstraints.map(compilePrimitiveSearchFor(tuple, compileEnv));


  let tupleSelection;

  if (allConditions.length === 0)
  {
    tupleSelection = `deltaPos === ${i} ? deltaTuples : ${selectPred(pred)}`;
  }
  else
  {
    let selection;
    const atomIndexedConstraints = indexes ? indexes.a2ic.get(atom) : [];
    if (atomIndexedConstraints.length === 0)
    {
      selection = selectPred(pred);
    }
    else
    {
      const index = indexes.a2i.get(atom);
      const indexIndex = indexes.p2i.get(atom.pred).findIndex(x => index.equals(x));
      assertTrue(indexIndex !== -1)
      const indexArgs = [];
      atomIndexedConstraints.forEach(c => {
        if (c instanceof Constraints.EqConstraint)
        {
          if (c.right instanceof Constraints.CVar)
          {
            indexArgs.push(compileEnv.get(c.right.name));
          }
        }
      });
      selection = `relation_${pred}.selectIndex${indexIndex}(${indexArgs.join()})`;
    }
    if (residualConditions.length > 0)
    {
      selection += `.filter(${tuple} => ${residualConditions.join(' && ')})`;
    }
    tupleSelection = `deltaPos === ${i} 
                        ? deltaTuples.filter(${tuple} => ${allConditions.join(' && ')}) 
                        : ${selection}`;
  }

  
  return `
    // atom ${atom}
    ${atomConstraints.map(c => `/// ${c}`).join('\n    ')}
    const tuples${i} = ${tupleSelection};
    for (const ${tuple} of tuples${i})
    {
      ${postFilterBindings.join('\n          ')}
      ${cont(rule, i + 1, compileEnv, ptuples, rcIncs)}
    }
    `;
}

function compileCreateFunctor(functor, env, termAids, rcIncs)
{
  const functorName = freshVariable("functor");
  rcIncs.push(functorName);
  const termExps = functor.terms;
  termAids.push(`
  // functor ${functor}
  const ${functorName} = functor_${functor.pred}.addGet(${termExps.map(exp => compileExpression(exp, env, termAids, rcIncs))})
  `);
  return functorName;
}

function compileRuleFireBody(rule, i, compileEnv, ptuples, rcIncs)
{
  const body = rule.body;
  if (i === body.length) // body evaluation completed, move to head to create tuple
  {
    return compileRuleHead(rule, compileEnv, ptuples);
  }

  const atom = body[i];

  if (atom instanceof Atom)
  {
    return compileAtom(atom, i, rule, compileEnv, ptuples, rcIncs, compileRuleFireBody);  
  }

  if (atom instanceof Neg)
  {
    return compileNegAtom(atom, i, rule, compileEnv, ptuples, rcIncs, compileRuleFireBody);  
  }

  if (atom instanceof App)
  {
    return compileApplicationAtom(atom, i, rule, compileEnv, ptuples, rcIncs, compileRuleFireBody);
  }

  if (atom instanceof Assign)
  {
    return compileAssignmentAtom(atom, i, rule, compileEnv, ptuples, rcIncs, compileRuleFireBody);
  }

  if (atom instanceof Lit)
  {
    return compileLitAtom(atom, i, rule, compileEnv, ptuples, rcIncs, compileRuleFireBody);
  }

  throw new Error(`cannot handle ${body[i]} of type ${body[i].constructor.name} in ${rule}`);
}

function compileNegAtom(atom, i, rule, compileEnv, ptuples, rcIncs, cont)
{
  const posAtom = atom.atom; // the negated atom (which is positive)
  const tuple = "tuple" + i;
  ptuples.push('NOT_' + tuple);
  const pred = posAtom.pred;
  const getValues = [];
  posAtom.terms.forEach((term, i) => {
    if (term instanceof Var) {
      if (compileEnv.has(term.name))
      {
        getValues.push(compileEnv.get(term.name));
      }
      else 
      {
        throw new Error(`unbound variable ${term.name} in negation in ${rule}`);
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
  // atom ${atom} (conditions)
  if (relation_${pred}.get(${getValues}) === null)
  {
    const NOT_${tuple} = relation_NOT_${pred}.addGet(${getValues})
    ${cont(rule, i + 1, compileEnv, ptuples, rcIncs)}
  }
  `;
}

function compileApplicationAtom(atom, i, rule, compileEnv, ptuples, rcIncs, cont) 
{
  const appC = compileApplication(atom, compileEnv);
  return `
      // application ${atom}
      if ((${appC}) !== false)
      {
        ${cont(rule, i + 1, compileEnv, ptuples, rcIncs)}
      } // application ${atom}
  `;
}

function compileAssignmentAtom(atom, i, rule, compileEnv, ptuples, rcIncs, cont)
{
  const op = atom.operator;
  const name = atom.left;
  const right = atom.right;

  assertTrue(op === ':=');
  assertTrue(name instanceof Var);

  if (compileEnv.has(name))
  {
    throw new RspJsCompilationError(`assigning bound name '${name}'`);
  }
  compileEnv.set(name.name, freshVariable(name.name));
  const nameC = compileExpression(name, compileEnv); // too broad
  const rightC = compileExpression(right, compileEnv);
  return `
    // assign ${atom}
    const ${nameC} = ${rightC};

    ${cont(rule, i + 1, compileEnv, ptuples, rcIncs)}
  `;
}

function compileLitAtom(atom, i, rule, compileEnv, ptuples, rcIncs, cont)
{
  const litC = compileExpression(atom, compileEnv);
  return `
      // literal ${atom}
      if ((${litC}) !== false)
      {
        ${cont(rule, i + 1, compileEnv, ptuples, rcIncs)}
      } // literal ${atom}
  `;
}

function emitRule(rule)
{
  /* rule (tuple arity ${tupleArity}) (${recursive ? 'recursive' : 'non-recursive'}) (non-aggregating)
  ${rule} 
  */
  const compileEnv = new Map();
  const tupleArity = rule.tupleArity();
  const recursive = analysis.ruleIsRecursive(rule); // TODO this must go at some point!
  const productName = `Rule${rule._id}`;

  const fire = `
  function fireRule${rule._id}(deltaPos, deltaTuples) // emitRule
  {
    ${logDebug(`'fire ${rule._id} ${rule}'`)}
    ${logDebug('`deltaPos ${deltaPos} deltaTuples ${[...deltaTuples].join()}`')}
  
    ${profileStart(`fireRule${rule._id}`)}
  
    const newTuples = new Set();
  
    ${compileRuleFireBody(rule, 0, compileEnv, [], [])}
  
    ${profileEnd(`fireRule${rule._id}`)}
  
    ${logDebug('`=> newTuples ${[...newTuples].join()}`')}
  
    return newTuples;
  } // end fireRule${rule._id}    
  `

  if (tupleArity > 0)
  {
    const productEmitter = createProductEmitter(productName, tupleArity, recursive, logDebug);

    return `
    ${productEmitter.objectDeclaration()}
    ${productEmitter.containerDeclaration()}
    const product_${productName} = ${productEmitter.instantiate()}    
    ${fire}
      `;  
  }
  else
  {
    return fire;
  }
}

function compileRuleGBFireBody(rule, i, compileEnv, ptuples) // TODO contains cloned code from `compileRule`
{
  const head = rule.head;
  const body = rule.body;
  if (i === body.length)
  {
    const agg = head.terms[head.terms.length - 1];
    assertTrue(agg instanceof Agg);
    const aggregate = agg.aggregate;
    const gb = head.terms.slice(0, head.terms.length - 1);
    const t2ps = ptuples.map(tuple => `${tuple}._outproductsgb.add(productGB);`);
    return `
      // updates for ${head}
      const productGB = ${addGetProdGB(`Rule${rule._id}`, ptuples)};
      const groupby = ${addGetGroupBy(`Rule${rule._id}`, gb.map(t => compileEnv.get(t.name)))};

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        productGB.value = ${compileEnv.get(aggregate.name)}; // TODO: aggregate is func dep on tuples, arrange this in another way (e.g. set in ctr)?
        productGB._outgb = groupby;
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [${compileEnv.get(aggregate.name)}]);
        }
        else
        {
          currentAdditionalValues.push(${compileEnv.get(aggregate.name)});
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
          conditions.push(`${tuple}.t${i} === ${compileEnv.get(term.name)}`);
        }
        else
        {
          const compiledName = freshVariable(term.name);
          compileEnv.set(term.name, compiledName);
          bindUnboundVars.push(`const ${compiledName} = ${tuple}.t${i};`);
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
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : ${selectPred(pred)}))
      {
        ${bindUnboundVars.join('\n        ')}
        ${compileRuleGBFireBody(rule, i+1, compileEnv, ptuples)}
      }
      `;  
    }
    else
    {
      return `
      // atom ${atom} [conditions]
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : ${selectPred(pred)}))
      {
        if (${conditions.join('&&')})
        {
          ${bindUnboundVars.join('\n        ')}
          ${compileRuleGBFireBody(rule, i+1, compileEnv, ptuples)}
        }
      }
      `;  
    }
  }

  if (atom instanceof App)
  {
    return compileApplicationAtom(atom, i, rule, compileEnv, ptuples, null /*rcIncs*/, compileRuleGBFireBody);
  }

  if (atom instanceof Assign)
  {
    return compileAssignmentAtom(atom, i, rule, compileEnv, ptuples, null /*rcIncs*/, compileRuleGBFireBody);
  }

  throw new Error(body[i]);
}

function emitRuleGB(rule)
{
  const compileEnv = new Map();
  const tupleArity = rule.tupleArity();
  const recursive = analysis.ruleIsRecursive(rule);
  // const tupleParams = Array.from({length:tupleArity}, (_, i) => `t${i}`);
  // const tupleFieldInits = Array.from(tupleParams, tp => `this.${tp} = ${tp}; // tuple`);
  // const tupleFields = Array.from(tupleParams, tp => `this.${tp}`);


  const numGbTerms = rule.head.terms.length - 1;
  // const tn = Array.from(Array(numGbTerms), (_, i) => "t" + i);
  // const termAssignments = tn.map(t => `this.${t} = ${t}`);
  // const termToStrings = tn.map(t => `this.${t}`);
  // const aggTerm = rule.head.terms[rule.head.terms.length - 1];


  if (recursive)
  {
    throw new Error(`${rule}: aggregating rules must not be recursive`);
  }

  const productName = `Rule${rule._id}`;

  const groupByEmitter = createGroupByEmitter(`Rule${rule._id}`, numGbTerms, logDebug);
  const productGBEmitter = createProductGBEmitter(productName, tupleArity, logDebug);
  
  return `
/* rule (tuple arity ${tupleArity}) (non-recursive) (aggregating) 
${rule} 
*/
${groupByEmitter.objectDeclaration()}
${groupByEmitter.containerDeclaration()}
const groupby_Rule${rule._id} = ${groupByEmitter.instantiate()}

${productGBEmitter.objectDeclaration()}
${productGBEmitter.containerDeclaration()}
const productGB_${productName} = ${productGBEmitter.instantiate()}

function fireRule${rule._id}GB(deltaPos, deltaTuples, updates)
{
  ${logDebug(`"fire ${rule}"`)}
  ${logDebug('`deltaPos ${deltaPos} deltaTuples ${[...deltaTuples].join()}`')}

  ${profileStart(`fireRule${rule._id}GB`)}

  const newTuples = new Set();

  ${compileRuleGBFireBody(rule, 0, compileEnv, [])}
  
  ${profileEnd(`fireRule${rule._id}GB`)}

  ${logDebug('`=> current updates: ${[...updates.entries()].join(", ")}`')}
} // end fireRule${rule._id}GB
  `;
}

function emitIterators(preds, edbPreds, rules)
{
  // const edbTupleYielders = edbPreds.map(pred => `yield* select_${pred}()`);
  // const gbYielders = rules.flatMap((rule, i) => rule.aggregates() ? [`//yield* Rule${rule._id}GB.members;`] : []);

  return `
// from membership
${publicFunction('tuples')}() 
{
  const result = [];
  ${preds.map(pred => `${selectPred(pred)}.forEach(tuple => result.push(tuple))`).join('\n  ')}
  return result;
}

${publicFunction('rootTuples')}()   // all EDBs and IDB facts
{
  // expensive impl: alternative would be to keep set of externally added EDBs and all IDB facts
  // but, this is cheap as long as reachability stuff (tracing) is not required
  const result = [];
  for (const tuple of tuples())
  {
    if (tuple._inproducts.size === 0)
    {
      result.push(tuple);
    }
  }
  return result;
}
`;
}

function emitClear(edbPreds)
{
  const clearers = edbPreds.map(edbPred => `removeTuples(${selectPred(edbPred)});`);

  return `
${publicFunction('clear')}()
{
  ${clearers.join('\n')}
}  
  `;
}

function emitCount(preds, functors, closures)
{
  return `
${publicFunction('count')}()
{
  const c1 = ${preds.flatMap(pred => [countPred(pred), ...pred.rules.map(rule => countProd(rule))]).join('\n      +')}
  const c2 = ${[0, ...functors.map(functor => `functor_${functor}.count()`)].join('\n      +')}
  const c3 = ${[0, ...closures.map(closure => countClosure(closure))].join('\n      +')}
  return c1 + c2 + c3;
}  
  `;
}

function compileExpression(exp, env, termAids, rcIncs)
{
  if (exp instanceof Var)
  {
    if (isNativeFunName(exp.name))
    {
      return requiredBuiltInFunDefs.add(exp.name);
    }
    const nameExp = env.get(exp.name);
    return nameExp ?? exp.name; // unresolved names are kept as is
  }
  if (exp instanceof Lit)
  {
    if (exp.value === true)
    {
      return 'true';
    }
    if (exp.value === false)
    {
      return 'false';
    }
    return String(exp);
  }
  if (exp instanceof App)
  {
    return compileApplication(exp, env, termAids, rcIncs);
  }
  if (exp instanceof Atom) // Functor
  {
    return compileCreateFunctor(exp, env, termAids, rcIncs);
  }
  if (exp instanceof Lam)
  {
   return compileLambda(exp, env, termAids, rcIncs);
  }
  throw new Error(`cannot handle expression ${exp} of type ${exp.constructor.name}`);
}

const syntacticLambdas = new Map();
function compileLambda(lam, env, termAids, rcIncs) // TODO update rcIncs and termAids: closure = allocated object
{
  assertTrue(env instanceof Map)
  let name = syntacticLambdas.get(lam);
  const closureVars = freeVariables(lam);
  const closureCompiledVars = closureVars.map(varName => env.get(varName)); // should be "stable" (same order each time this is called)

  if (name === undefined) // TODO: all lambdas are encountered only once?
  {
    name = freshVariable("lambda");
    syntacticLambdas.set(lam, name);
    const extendedEnv = new Map(env);
    for (const param of lam.params)
    {
      extendedEnv.set(param.name, freshVariable(param.name));
    }
    const rcIncs2 = [];
    const termAids2 = [];
    const compiledBody = compileExpression(lam.body, extendedEnv, termAids2, rcIncs2);

    const closureEmitter = createClosureEmitter(name, closureVars.length);
    // TODO: should become part of rsp2js-emitters
    lambdas.add(`
// ${lam}    
function ${name}(${closureCompiledVars.join(', ')})
{
  const closure = function(${lam.params.map(param => extendedEnv.get(param.name)).join(', ')})
  {
      ${termAids2.join('\n        ')}
      ${rcIncs2.map(x => `closure._refs.push(${x})`).join('\n        ')}
      ${rcIncs2.map(x => `${x}._rc++;`).join('\n        ')}
      return ${compiledBody};
  };
  closure._rc = 0;
  closure._refs = [];
  closure._remove = function () { closure_${name}.removeDirect(closure) };
  return closure;
}
    `);
    lambdas.add(closureEmitter.declaration());
    lambdas.add(`const closure_${name} = ${closureEmitter.instantiate()}`);
  }
  const closureName = freshVariable("closure");
  rcIncs.push(closureName);
  termAids.push(`
  // closure ${name}
  const ${closureName} = closure_${name}.addGet(${closureCompiledVars})
  `);
  return closureName;
}

function compileApplication(app, env, termAids, rcIncs)
{
  assertTrue(env instanceof Map)

  function compileRatorRands(i)
  {
    if (i === rands.length - 2)
    {
      return `${compileExpression(rands[i], env)} ${rator.name} ${compileExpression(rands[i+1], env, termAids, rcIncs)}`;
    }
    return `${compileExpression(rands[0], env)} ${rator.name} ${compileRatorRands(i+1, env, termAids, rcIncs)}`;
  }

  const rator = app.operator;
  const rands = app.operands;
  if (rator instanceof Var)
  {
    switch (rator.name)
    {
      case "=":
        return `${compileExpression(rands[0], env)} === ${compileExpression(rands[1], env, termAids, rcIncs)}`;
      case "!=":
        return `${compileExpression(rands[0], env)} !== ${compileExpression(rands[1], env, termAids, rcIncs)}`;
      case ">":
      case ">=":
      case "<":
      case "<=":
        return `${compileExpression(rands[0], env, termAids, rcIncs)} ${rator.name} ${compileExpression(rands[1], env, termAids, rcIncs)}`;
      case "+":
      case "-":
    {
      if (rands.length === 1)
      {
          return `${compileExpression(app.operands[0], env, termAids, rcIncs)}`; // ignore + (?)
      }
      if (rands.length > 1)
      {
          return rands.map(exp => compileExpression(exp, env, termAids, rcIncs)).map(e => `(${e})`).join(rator.name);
      }
    }
      case "*":
      case "/":
      if (rands.length > 1)
      {
        return rands.map(exp => compileExpression(exp, env, termAids, rcIncs)).map(e => `(${e})`).join(rator.name);
      }
      case "not":
        return `!${compileExpression(rands[0], env, termAids, rcIncs)}`;
      case "even?":
        return `(${compileExpression(rands[0], env, termAids, rcIncs)}) % 2 === 0`;
      case "odd?":
        return `(${compileExpression(rands[0], env, termAids, rcIncs)}) % 2 === 1`;
    }
  }
  return `(${compileExpression(rator, env, termAids, rcIncs)})(${rands.map(exp => compileExpression(exp, env, termAids, rcIncs)).join(', ')})`;
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
        ${fireRuleInto(rule, i, `added_${pred}_tuples`, `Rule${rule._id}_tuples${i}`)}
        ${addAllTuples(`added_${producesPred}_tuples`, `Rule${rule._id}_tuples${i}`)}
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
      ${fireRuleInto(rule, i, `removed_${pred}_tuples`, `Rule${rule._id}_tuples${i}`)} // TODO inefficient: does full scan in lrnu
      ${addAllTuples(`added_${producesPred}_tuples`, `Rule${rule._id}_tuples${i}`)}  
    }
  `];
  }
  return [];
}

///////////// 

function emitComputeInitialAdd(strata, preds) 
{
  const deltaAddedTuplesEntries = preds.map(pred => `[${pred}, added_${pred}_tuples]`);

  return `
function computeInitialAdd()
{
  const addedTuplesMap = new Map();
  ${logDebug('"=== computeInitialAdd"')}
  ${logDebug('"addedTupleMap " + [...addedTuplesMap.values()]')}

  ${strata.map(stratumInitialAddLogic).join('\n')}
  
  ${logDebug('"=== done computeInitialAdd"')}
  return {
    added() {return new Map([${[...deltaAddedTuplesEntries]}])},
    removed() {return new Map()}
    }
} // computeInitialAdd
`;
}

function stratumInitialAddLogic(stratum)
{
  const globalEdbStratum = analysis.stratumIsEdb(stratum);

  const sb = [`
    ${logDebug(`"=== stratum ${stratum}"`)}
    // stratum ${stratum.id} ${globalEdbStratum ? `(global edb)` : `(global idb)`}
    // preds: ${stratum.preds.join(', ')}
    // non-recursive rules: ${[...stratum.nonRecursiveRules].map(rule => "Rule" + rule._id)}
    // recursive rules: ${[...stratum.recursiveRules].map(rule => "Rule" + rule._id)}  
    `];

    // ${logDebug('"adding edb tuples due to fact addition by firing fact rule"')}


  if (globalEdbStratum)
  {
    for (const pred of stratum.preds)
    {
      assertTrue(pred.edb);
      sb.push(`
      // adding initial ${pred} tuples
      const added_${pred}_tuples = [];

      ${pred.rules.filter(rule => rule.tupleArity() === 0).map(rule => `
        /* fact: ${rule} */
        ${fireRuleInto(rule, -1, `[]`, `added_${pred}_tuples_${rule._id}`)} // TODO delta pos and tuple not required for fact rules
        ${addAllTuples(`added_${pred}_tuples`, `added_${pred}_tuples_${rule._id}`)}
        `).join('\n')}
      `);  
    }      
  }
  else // global idb stratum
  {
    if (analysis.stratumHasRecursiveRule(stratum)) // TODO: this conditional only checks assumptions, keep?
    {
      sb.push(`// stratum has recursive rules`);
      assertTrue(stratum.preds.every(pred => analysis.predHasRecursiveRule(pred)));      
    }
    else // single-pred non-recursive stratum
    {
      sb.push(`// single-pred non-recursive stratum`);
      assertTrue(stratum.preds.length === 1);
    }
     
    for (const pred of stratum.preds)
    {
      sb.push(`const added_${pred}_tuples = addedTuplesMap.get(${pred})?.slice(0) ?? [];`); // `slice` for copying (need to keep original facts) TODO optimize by emitting only `[]` when no fact rules exist

      // although this fires all rules (recursive or not), this already takes care of the non-recursive rules
      sb.push(logDebug('"adding idb tuples due to stratum-edb addition by firing all rules once"')); 
      for (const rule of pred.rules)
      {
        if (rule.aggregates())
        {
          sb.push(emitDeltaEdbForAggregatingRule(rule, stratum)); // TODO: wrong !!!
        }
        else
        {
          // fire the rule with all available tuples (all tuples being added)
          // all tuples are considered delta and therefore rule is fired once, with only delta tuples
          // therefore, specific deltaPos and deltaTuples not required
          const producesPred = rule.head.pred;
          sb.push(`
            /* Rule${rule._id} (non-aggregating)
        ${rule}
            */
          ${fireRuleInto(rule, -1, `[]`, `${producesPred}_tuples_${rule._id}`)};
          ${addAllTuples(`added_${producesPred}_tuples`, `${producesPred}_tuples_${rule._id}`)}; // not reqd for rdb
        `);
        }
      }
    }
  
    // now, we still must fixpoint the recursive rules
    if (stratum.recursiveRules.size > 0)
    {
      sb.push(logDebug('"adding idb tuples due to stratum-idb addition by firing recursive rules"')); 
      const recursivePreds = new Set(stratum.preds.map(pred => pred.name))
      sb.push(`// recursive preds: ${[...recursivePreds].join()}`);
      // here we can use emitRecursiveRules (also used for deltas),
      // because there will be no negation involved
      const recursiveRules = emitRecursiveRules([...stratum.recursiveRules], recursivePreds);
      sb.push(recursiveRules);
    }    
  }

  return sb.join('\n');
}

///////////// 



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
      const updatedResultTuple = relation_${pred}.addGet(${[...gbNames, `updatedValue`]})  
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
        ${fireRuleInto(rule, i, `local_${pred}_tuples`, `${producesPred}_tuples_${rule._id}_${i}`)};
        ${addAllTuples(`new_${producesPred}_tuples`, `${producesPred}_tuples_${rule._id}_${i}`)};
        ${addAllTuples(`added_${producesPred}_tuples`, `${producesPred}_tuples_${rule._id}_${i}`)}; // not reqd for rdb
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
    /* Rule${rule._id} (recursive)
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


function emitDeltaAddEdbTuple(pred)
{
  const tn = termNames(pred);
  const termProperties = Array.from(Arrays.range(pred.arity)).map(i => `proposed.t${i}`);
  return `

function delta_add_${pred}_tuples(proposedEdbTuples)
{
  const ${pred}_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = relation_${pred}.addGet(${termProperties})
    if (actual !== proposed)
    {
      ${pred}_tuples.push(actual);
    }
  }
  return ${pred}_tuples;
}
  `
}

function emitDeltaAddIdbTuple(pred, pTupleArity)
{
  return `
  function delta_add_${pred}_tuple(${termNames2(pred.arity).join(', ')}, newTuples, ${Arrays.range(pTupleArity).map(i => `tuple${i}`)})
  {

  }
  `;
}

function compileRuleHead(rule, compileEnv, ptuples)
{
  const head = rule.head;
  const pred = head.pred;
  const fact = rule.tupleArity() === 0;

  // TODO: currently, only allocation by head expressions is tracked
  const rcIncs = [];
  const termAids = [];

  const termExps = head.terms.map(exp => compileExpression(exp, compileEnv, termAids, rcIncs));

  if (fact)
  {
    return `
    // adding edb ${head}
    
    // term aids
    ${termAids.join('\n')}
    
    // actual adding
    const existing_${pred}_tuple = relation_${pred}.get(${termExps})
    if (existing_${pred}_tuple === null)
    {
      const new_${pred}_tuple = relation_${pred}.addGet(${termExps})
      newTuples.add(new_${pred}_tuple);
      ${rcIncs.map(x => `new_${pred}_tuple._refs.push(${x})`).join('\n        ')}
      ${rcIncs.map(x => `${x}._rc++;`).join('\n        ')}
    }
    `;
  }
  else // derived tuple: construct product, deal with provenance
  {
    const t2ps = ptuples.map(tupleExp => addOutProductPred(analysis.name2pred.get(pred), tupleExp, `product`));
    const noRecursionConditions = ptuples.map(tuple => `${tuple} !== existing_${pred}_tuple`);

    return `
    // adding idb ${head}
    // term aids
    ${termAids.join('\n')}

    // actual adding
    const existing_${pred}_tuple = relation_${pred}.get(${termExps});
    if (existing_${pred}_tuple === null)
    {
      const new_${pred}_tuple = relation_${pred}.addGet(${termExps});
      newTuples.add(new_${pred}_tuple);
      // const product = new Rule${rule._id}_Product(${ptuples});
      // ${addProd(`Rule${rule._id}`, `product`)};
      const product = ${addGetProd(`Rule${rule._id}`, ptuples)};
      ${t2ps.join('\n        ')}
      product._outtuple = new_${pred}_tuple;
      new_${pred}_tuple._inproducts.add(product);
      ${rcIncs.map(x => `new_${pred}_tuple._refs.push(${x})`).join('\n        ')}
      ${rcIncs.map(x => `${x}._rc++;`).join('\n        ')}
    }
    else if (${noRecursionConditions.join(' && ')}) // remove direct recursion in product
    {
      const product = ${addGetProd(`Rule${rule._id}`, ptuples)};
      ${t2ps.join('\n        ')}
      product._outtuple = existing_${pred}_tuple;
      existing_${pred}_tuple._inproducts.add(product);
    }      
  `;
  }  
}

function emitRemoveIdbDueToAddition(pred)
{
  const sb = [];
  sb.push(emitDeltaRemoveNOTTuple(pred));
  const tn = termNames2(pred.arity);
  const fieldAccesses = tn.map(n => `added_${pred}_tuple.${n}`);    
  sb.push(`
  ${logDebug(`"removing idb tuples due to addition of ${pred} tuples"`)}
  for (const added_${pred}_tuple of added_${pred}_tuples)
  {
    const NOT_${pred}_tuple = relation_NOT_${pred}.get(${fieldAccesses});
    if (NOT_${pred}_tuple !== null)
    {
      deltaRemove_NOT_${pred}(NOT_${pred}_tuple);
    }
  }  
  `);
  return sb.join('\n');
}

function stratumDeltaLogic(stratum)
{
  const globalEdbStratum = analysis.stratumIsEdb(stratum);

  const sb = [`
    ${logDebug(`"=== stratum ${stratum}"`)}
    // stratum ${stratum.id} ${globalEdbStratum ? `(global edb)` : `(global idb)`}
    // preds: ${stratum.preds.join(', ')}
    // non-recursive rules: ${[...stratum.nonRecursiveRules].map(rule => "Rule" + rule._id)}
    // recursive rules: ${[...stratum.recursiveRules].map(rule => "Rule" + rule._id)}  
    `];

  
  for (const pred of stratum.preds)
  {
    sb.push(emitDeltaRemoveTuple(pred));
  }

  if (globalEdbStratum)
  {
    for (const pred of stratum.preds)
    {
      assertTrue(pred.edb);
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
    for (const pred of stratum.preds)
    {
      assertTrue(!pred.stratumIsEdb);      
    }

    if (analysis.stratumHasRecursiveRule(stratum))
    {
      sb.push(`// stratum has recursive rules`);
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
      sb.push(`// single-pred non-recursive stratum`);
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
      //sb.push(`const added_${pred}_tuples = addedTuplesMap.get(${pred})?.slice(0) ?? [];`); // during delta you cannot have idbs due to facts

      // although this fires all rules (recursive or not), this already takes care of the non-recursive rules
      sb.push(logDebug('"adding idb tuples due to stratum-edb addition by firing all rules once"'));
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
  
    // now, we still must fixpoint the recursive rules
    if (stratum.recursiveRules.size > 0)
    {
      sb.push(logDebug('"adding idb tuples due to stratum-idb addition by firing recursive rules"')); 
      const recursivePreds = new Set(stratum.preds.map(pred => pred.name))
      sb.push(`// recursive preds: ${[...recursivePreds].join()}`);
      const recursiveRules = emitRecursiveRules([...stratum.recursiveRules], recursivePreds);
      sb.push(recursiveRules);
    }    
  }

  for (const pred of stratum.preds)
  {
    if (pred.negAppearsIn.size > 0)
    {
      sb.push(emitRemoveIdbDueToAddition(pred));
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
        if (outproduct instanceof Rule${r._id}_Product)
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
    relation_${pred}.remove(${tns.map(tn => `${pred}_tuple.${tn}`)});
    removed_${pred}_tuples.push(${pred}_tuple);
    for (const outproduct of ${outProductsPred(pred, `${pred}_tuple`)})
    {
      outproduct._remove();
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
        if (outproduct instanceof Rule${r._id}_Product)
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
    relation_NOT_${pred}.remove(${tns.map(tn => `NOT_${pred}_tuple.${tn}`)});
    // removed_NOT_${pred}_tuples.push(NOT_${pred}_tuple); // TODO is this ever used?
    for (const outproduct of ${outProductsPred(`NOT_${pred}`, `NOT_${pred}_tuple`)})
    {
      ${productRemoval.join('  else')}
    }
  }`;
}


function emitComputeDelta(strata, preds) 
{
  const deltaAddedTuplesEntries = preds.map(pred => `[${pred}, added_${pred}_tuples]`);
  const deltaRemovedTuplesEntries = preds.map(pred => `[${pred}, removed_${pred}_tuples]`);

  return `
${publicFunction('computeDelta')}(addTuples, remTuples)
{
  const addedTuplesMap = new Map(addTuples);
  const removedTuplesMap = new Map(remTuples);
  ${logDebug('"=== computeDelta"')}
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


  ${strata.map(stratumDeltaLogic).join('\n')}
  
  ${logDebug('"=== done computeDelta"')}
  return {
    added() {return new Map([${[...deltaAddedTuplesEntries]}])},
    removed() {return new Map([${[...deltaRemovedTuplesEntries]}])}
    }
} // computeDelta
`;
}


function emitIsGrounded(strata)
{
  return `


function tupleIsGrounded(tuple)
{
  const seen = new Set();
  const groundedCache = new Set(); // TODO: can we make this more global/incremental?
                                    // now gets 'cleared' on every recursive check (see factorial example)

  function groundedTuple(tuple)
  {

    // with recursive rules it's possible that the same grounded tuple is encountered when moving up the prov tree:
    // therefore, cache known grounded tuples, and only declare cycle for re-encountered non-cached tuples 
    if (groundedCache.has(tuple))
    {
      ${logDebug('`${tuple} grounded: in cache`')}
      return true;
    }

    if (seen.has(tuple))
    {
      ${logDebug('`${tuple} not grounded: cycle`')}
      return false;
    }
    seen.add(tuple);

    if (tuple._inproducts.size === 0)
    {
      ${logDebug('`${tuple} grounded: no inproducts`')}
      groundedCache.add(tuple);
      return true;
    }
    for (const inproduct of tuple._inproducts)
    {
      if (!inproduct.recursive())
      {
        // known to be grounded because of incoming product from lower stratum
        ${logDebug('`${tuple} grounded because of non-recursive product ${inproduct}`')}
        groundedCache.add(tuple);
        return true;
      }
      if (groundedProduct(inproduct))
      {
        ${logDebug('`${tuple} grounded because of product ${inproduct}`')}
        groundedCache.add(tuple);
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

  ${logDebug('`is ${tuple} grounded? ...`')}
  const isGrounded = groundedTuple(tuple);
  ${logDebug('`... ${tuple} is ${isGrounded ? "" : "not "}grounded`')}
  return isGrounded;
}
`;
}

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


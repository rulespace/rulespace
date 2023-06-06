import { MutableSets, MutableMaps } from './deps.ts';
import { Atom, Neg, App, Assign, Lit, Var, Lam, Agg, Rule } from './rsp.js';

// TODO: flag assignment to already bound identifier:  [X x] [Y y] [:= x y]

export class AnalysisError extends Error
{
  constructor(msg)
  {
    super(msg);
    this.name = 'AnalysisError';
  }
}

function topoSort(predicates)
{

  const sccs = [];

  let index = 0;
  const S = [];

  for (const v of predicates)
  {
    if (v.index === undefined)
    {
      strongconnect(v);
    }
  } 

  function strongconnect(v)
  {
    v.index = index;
    v.lowlink = index;
    index++;
    S.push(v);
    v.onStack = true;

    for (const w of v.precedes)
    {
      if (w.index === undefined)
      {
        strongconnect(w);
        v.lowlink = Math.min(v.lowlink, w.lowlink);
      }
      else if (w.onStack)
      {
        v.lowlink = Math.min(v.lowlink, w.index);
      }
    }
    
    if (v.lowlink === v.index)
    {
      const scc = [];
      let w;
      do
      {
        w = S.pop();
        w.onStack = false;
        scc.push(w);
      }
      while (w !== v)
      sccs.push(scc);
    }
  }
  const rsccs = sccs.reverse();
  return rsccs;
}
 
class Pred
{
  constructor(name, arity)
  {
    this.name = name;
    this.arity = arity;
    this.edb = true;
    this.idb = false;
    this.rules = [];
    this.posDependsOn = new Set();
    this.negDependsOn = new Set();
    this.posAppearsIn = new Set();
    this.negAppearsIn = new Set();
    this.precedes = new Set();
}

  toString()
  {
    return this.name;
  }
}

class Functor
{
  constructor(name, arity)
  {
    this.name = name;
    this.arity = arity;
  }
  
  toString()
  {
    return this.name;
  }
}

function collect(program)
{

  const name2pred = new Map();
  const name2functor = new Map();

  function handleLambda(lam)
  {
    handleExp(lam.body);
  }

  function handleApp(app)
  {
    handleExp(app.operator);
    for (const rand of app.operands)
    {
      handleExp(rand);
    }
  }

  function handleFunctor(functor)
  {
    const name = functor.pred;
    if (name2pred.has(name))
    {
      throw new AnalysisError(`functor '${name}' is already declared as predicate`);
    }
    const arity = functor.arity();
    let func = name2functor.get(name);
    if (func === undefined)
    {
      func = new Functor(name, arity);
      name2functor.set(name, func);
    }
    else if (func.arity !== arity)
    {
      throw new AnalysisError(`arity mismatch for functor '${func}'`);
    }

    // scan exps
    for (const exp of functor.terms)
    {
      if (exp instanceof Atom)
      {
        // atom exp in functor = functor
        handleFunctor(exp);
      }
    }
  }

  function handleExp(exp)
  {
    if (exp instanceof Atom)
    {
      // atom exp = functor
      handleFunctor(exp);
    }
    else if (exp instanceof Lit || exp instanceof Var || exp instanceof Agg)
    {
      // do nothing
    }
    else if (exp instanceof Lam)
    {
      handleLambda(exp);
    }
    else if (exp instanceof App)
    {
      handleApp(exp);
    }
    else
    {
      throw new Error(`cannot handle expression ${exp} of type ${exp?.constructor?.name}`);
    }
  }

  function handleAtom(atom, rule)
  {
    const name = atom.pred;
    if (name2functor.has(name))
    {
      throw new AnalysisError(`predicate '${name}' is already declared as functor`);
    }
    const arity = atom.arity();
    let pred = name2pred.get(name);
    if (pred === undefined)
    {
      pred = new Pred(name, arity);
      name2pred.set(name, pred);
    }
    else if (pred.arity !== arity)
    {
      throw new AnalysisError(`arity mismatch for atom ${atom} in rule ${rule}: expected arity ${pred.arity}, got ${arity}`);
    }

    // scan exps
    for (const exp of atom.terms)
    {
      handleExp(exp);
    }
    return pred;
  }

  for (const rel of program.relations)
  {
    handleAtom(rel);
  }

  for (const rule of program.rules)
  {
    const head = rule.head;
    const headPred = handleAtom(head, rule);
    if (rule.tupleArity() > 0)
    {
      headPred.idb = true;
      headPred.edb = false;  
    }
    headPred.rules.push(rule);

    for (const atom of rule.body)
    {
      if (atom instanceof Atom)
      {
        const pred = handleAtom(atom, rule);
        pred.precedes.add(headPred);
        headPred.posDependsOn.add(pred);
        pred.posAppearsIn.add(rule);
      }
      else if (atom instanceof Neg)
      {
        const posAtom = atom.atom;
        const pred = handleAtom(posAtom, rule);
        pred.precedes.add(headPred);
        headPred.negDependsOn.add(pred);
        pred.negAppearsIn.add(rule);
      }
      else if (atom instanceof App)
      {
        // ignore
      }
      else if (atom instanceof Assign)
      {
        // ignore
      }
      else if (atom instanceof Lit)
      {
        // ignore
      }
      else
      {
        throw new Error(`cannot handle ${atom} of type ${atom.constructor.name} in ${rule}`);
      }  
    }
  } 
  return { name2pred, name2functor };
}

class Stratum
{
  constructor(id, preds)
  {
    this.id = id;
    this.preds = preds;
    this.nonRecursiveRules = new Set();    
    this.recursiveRules = new Set();

    // pred -> [{rule, atompos}]
    this.pred2negDeps = new Map();

    this.posDependsOn = new Set(); // derived from this.preds
    this.negDependsOn = new Set(); // derived from this.preds

    this.edb = preds.every(pred => pred.edb); // TODO: is `every` correct?
  }

  isStratumPredName(predName)
  {
    for (const pred of this.preds)
    {
      if (pred.name === predName)
      {
        return true;
      }
    }
    return false;
  }

  toString()
  {
    return `{stratum id:${this.id} preds:${this.preds.join(",")}}`;
  }
}


function makeStratum(name2pred)
{

  function isStratumRecursiveRule(rule, scPreds)
  {
    for (const atom of rule.body)
    {
      if (atom instanceof Atom) // only pos deps can result in recursive rule
      {
        const bodyPred = name2pred.get(atom.pred);
        if (scPreds.includes(bodyPred))
        {
          return true;
        }  
      }
    }
    return false;
  }

  return function (scPreds, id)
  {
    const stratum = new Stratum(id, scPreds);
    for (const pred of scPreds)
    {
      pred.stratum = stratum;
      MutableSets.addAll(stratum.posDependsOn, pred.posDependsOn);
      MutableSets.addAll(stratum.negDependsOn, pred.negDependsOn);
      for (const rule of pred.rules)
      {
        if (isStratumRecursiveRule(rule, scPreds))
        {
          stratum.recursiveRules.add(rule);
        }
        else
        {
          stratum.nonRecursiveRules.add(rule);
        }

        for (let i = 0; i < rule.body.length; i++)
        {
          const b = rule.body[i];
          if (b instanceof Neg)
          {
            MutableMaps.putPushArray(stratum.pred2negDeps, b.atom.pred, {rule, i});
          }
        }
      }
    }
    return stratum;
  }
}


export function analyzeProgram(program)
{
  const { name2pred, name2functor } = collect(program);
  const predicates = [...name2pred.values()];
  const sccPreds = topoSort(predicates);
  const strata = sccPreds.map(makeStratum(name2pred));
  const preds = sccPreds.flat();

  // for (const stratum of strata)
  // {
  //   console.log(stratum.id, stratum.preds.join());
  // }

  const rule2stratum = new Map();
  strata.forEach(stratum =>
    {
      for (const rule of stratum.nonRecursiveRules)
      {
        rule2stratum.set(rule, stratum);
      }
      for (const rule of stratum.recursiveRules)
      {
        rule2stratum.set(rule, stratum);
      }
    });

  const self = { 
    program, name2pred,
    preds,    
    
    strata()
    {
      return strata;
    },


    functors()
    {
      return [...name2functor.values()];
    },


    // TODO must be broken up (per stratum, into cyclic preds(?) or something similar)
    cyclicNegations()
    {
      const result = [];
      const strata = this.strata();
      for (const stratum of strata)
      {
        const stratumPreds = this.stratumPreds(stratum);
        for (const pred of stratumPreds)
        {
          for (const stratumRule of this.predRules(pred))
          {
            for (const atom of stratumRule.body)
            {
              if (atom instanceof Neg)
              {
                const posAtom = atom.atom;
                const negatedPred = this.name2pred.get(posAtom.pred);
                if (stratumPreds.includes(negatedPred))
                {
                  result.push({negatedPred, stratumRule, stratum});
                }
              }
            }  
          }
        }
      }
      return result;
    },


    predNegativelyAppearsInRules(pred)
    {
      return [...pred.negAppearsIn];
    },

    // predStratum(pred)
    // {
    //   return strata[pred.index]; WRONG! need pred2stratum during collect
    // },

    predRules(pred)
    {
      return pred.rules;
    },

    // is there at least one rule that produces pred that is not recursive
    // (i.e., rule from from a lower stratum)
    // => `true` for local edb preds that are not also global edb (latter don't have producing rules)
    predHasNonRecursiveRule(pred)
    {
      for (const rule of pred.rules)
      {
        if (this.ruleIsNonRecursive(rule))
        {
          return true;
        }
      }
      return false;
    },

    predHasRecursiveRule(pred)
    {
      for (const rule of pred.rules)
      {
        if (this.ruleIsRecursive(rule))
        {
          return true;
        }
      }
      return false;
    },

    predHasAggregatingRule(pred)
    {
      return pred.rules.some(r => this.ruleIsAggregating(r));
    },

    predHasNonAggregatingRule(pred)
    {
      return pred.rules.some(r => !this.ruleIsAggregating(r));
    },

    ruleStratum(rule)
    {
      return rule2stratum.get(rule);
    },

    ruleIsNonRecursive(rule)
    {
      const stratum = rule2stratum.get(rule);
      return stratum.nonRecursiveRules.has(rule);
    },

    ruleIsRecursive(rule)
    {
      const stratum = rule2stratum.get(rule);
      return stratum.recursiveRules.has(rule);
    },

    ruleIsAggregating(rule)
    {
      return rule.aggregates();
    },

    stratumHasRecursiveRule(stratum)
    {
      return stratum.recursiveRules.size > 0;
    },

    stratumIsEdb(stratum)
    {
      return stratum.edb;
    },

    stratumPreds(stratum)
    {
      return stratum.preds;
    }
  };

  return self;
}

export function freeVariables(exp)
{
  const vars = new Set(); // Set has insertion order, so is 'stable'
  
  function fv(exp, env)
  {
    if (exp instanceof Lit)
    {
      // nothing
    }
    else if (exp instanceof Var)
    {
      if (!env.has(exp.name)) 
      {
        vars.add(exp.name);
      }
    }
    else if (exp instanceof Lam)
    {
      const params = exp.params;
      const env2 = new Set(env);
      for (const param of params)
      {
        env2.add(param.name);
      }
      const body = exp.body;
      fv(body, env2);
    }
    else if (exp instanceof Atom)
    {
      for (const term of exp.terms)
      {
        fv(term, env);
      }
    }
    else if (exp instanceof App)
    {
      fv(exp.operator, env);
      for (const rand of exp.operands)
      {
        fv(rand, env);
      }
    }
    else
    {
      throw new Error(`cannot handle expression ${exp} of type ${exp?.constructor?.name}`); 
    }
    // app
    // var exps = exp;
    // var free = [];
    // while (!(exps instanceof Null))
    // {
    //   var exp = exps.car;
    //   free = free.concat(fv(exp, env));
    //   exps = exps.cdr;
    // }
    // return free;

        // if (name === "let")
        // {
        //   var param = exp.cdr.car.car.car;
        //   var exp =  exp.cdr.car.car.cdr.car;
        //   var body = exp.cdr.cdr.car;

        //   var env2 = new Set(env);
        //   env2.add(param.name);
        //   return fv(exp, env).concat(fv(body, env2));
        // }
        // if (name === "letrec")
        // {
        //   var param = exp.cdr.car.car.car;
        //   var exp =  exp.cdr.car.car.cdr.car;
        //   var body = exp.cdr.cdr.car;
        //   var env2 = new Set(env);
        //   env2.add(param.name);
        //   return fv(exp, env2).concat(fv(body, env2));
        // }
        // if (name === "if")
        // {
        //   var cond = exp.cdr.car;
        //   var cons = exp.cdr.cdr.car;
        //   var alt = exp.cdr.cdr.cdr.car;
        //   return fv(cond, env).concat(fv(cons, env)).concat(fv(alt, env));
        // }
        // if (name === "quote")
        // {
        //   return [];
        // }
        // if (name === "and" || name === "or")
        // {
        //   var exp1 = exp.cdr.car;
        //   var exp2 = exp.cdr.cdr.car;
        //   return fv(exp1, env).concat(fv(exp2, env));
        // } 
  }
  
  fv(exp);
  return [...vars];
}
  

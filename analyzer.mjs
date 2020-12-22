import { assertTrue } from './common.mjs';
import { Sym, Tuple, Pair } from './parser.mjs';

export class Lit
{
  constructor(x)
  {
    this.x = x;
  }

  toString()
  {
    const x = this.x;
    if (typeof x === "string")
    {
      return "'" + x + "'";
    }
    return String(x);
  }
}

export class Var
{
  constructor(name)
  {
    this.name = name;
  }

  toString()
  {
    return String(this.name);
  }
}

export class Atom
{
  constructor(pred, terms)
  {
    this.pred = pred;
    this.terms = terms;
  }

  arity()
  {
    return this.terms.length;
  }

  toString()
  {
    return `[${this.pred} ${this.terms.join(' ')}]`;
  }
}

export class Neg
{
  constructor(atom)
  {
    this.atom = atom;
  }

  toString()
  {
    return "¬" + this.atom;
  }
}

export class Agg
{
  constructor(aggregator, aggregand)
  {
    this.aggregator = aggregator;
    this.aggregand = aggregand;
  }

  toString()
  {
    return `{${this.aggregator}: ${this.aggregand}}`;
  }
}

export class Rule
{
  static counter = 0;
  constructor(head, body)
  {
    this.head = head;
    this.body = body;
    this._id = Rule.counter++;
  }

  aggregates()
  {
    return this.head.terms[this.head.terms.length - 1] instanceof Agg;
  }

  bodyAtoms()
  {
    return this.body.filter(term => term instanceof Atom);
  }

  toString()
  {
    return `${this.head} :- ${this.body.join()}`;
  }
}

export class Program
{
  constructor(rules)
  {
    this.rules = rules;
  }

  toString()
  {
    return this.rules.join('\n');
  }
}

export class Assign
{
  constructor(operator, left, right)
  {
    this.operator = operator;
    this.left = left;
    this.right = right;
  }

  toString()
  {
    return `${this.left}${this.operator}${this.right}`;
  }
}

export class Bin
{
  constructor(operator, left, right)
  {
    this.operator = operator;
    this.left = left;
    this.right = right;
  }

  toString()
  {
    return `${this.left}${this.operator}${this.right}`;
  }
}

export function structuralAnalysis(exp)
{

  function analyzeRule(ruleExp)
  {
    const headExp = ruleExp.cdr.car;
    const bodyExp = ruleExp.cdr.cdr;
    const head = analyzeAtom(headExp);
    const body = [...bodyExp].map(analyzeTerm);
    return new Rule(head, body);
  }

  function analyzeAtom(tuple)
  {
    const pred = tuple.pred.name;
    const terms = tuple.terms.map(analyzeTerm);
    return new Atom(pred, terms);
  }

  function analyzeTerm(exp)
  {
    if (exp instanceof Sym)
    {
      return new Var(exp.name);
    }

    if (exp instanceof Tuple)
    {
      return analyzeAtom(exp);
    }

    if (exp instanceof Pair)
    {
      const rator = exp.car;
      assertTrue(rator instanceof Sym)
      assertTrue(rator.name === 'not')
      const negated = analyzeTerm(exp.cdr.car);
      return new Neg(negated);
    }

    return new Lit(exp.valueOf()); // TODO: valueOf needed?
  }
  
  const rules = [];
  for (const rule of exp)
  {
    rules.push(analyzeRule(rule));
  }

  return new Program(rules);
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
    this.rules = new Set();
    this.posDependsOn = new Set();
    this.negDependsOn = new Set();
    this.precedes = new Set();
    this.negated = false;
  }

  toString()
  {
    return this.name;
  }
}

function collect(program)
{

  const name2pred = new Map();

  function handleAtom(atom)
  {
    const name = atom.pred;
    const arity = atom.arity();
    let pred = name2pred.get(name);
    if (pred === undefined)
    {
      pred = new Pred(name, arity);
      name2pred.set(name, pred);
      return pred;
    }
    if (pred.arity !== arity)
    {
      throw new Error("arity mismatch: " + pred);
    }
    return pred;
  }

  for (const rule of program.rules)
  {
    const head = rule.head;
    const headPred = handleAtom(head);
    headPred.idb = true;
    headPred.edb = false;
    headPred.rules.add(rule);
    for (const term of rule.body)
    {
      if (term instanceof Atom)
      {
        const pred = handleAtom(term);
        pred.precedes.add(headPred);
        headPred.posDependsOn.add(pred);
      }
      else if (term instanceof Neg)
      {
        const atom = term.atom;
        const pred = handleAtom(atom);
        pred.precedes.add(headPred);
        headPred.negDependsOn.add(pred);
        pred.negated = true;
      }
    }
  }

  return { name2pred };
}

function Stratum(id, preds)
{
  this.id = id;
  this.preds = preds;
  this.dependsOnPreds = new Set();
  this.nonRecursiveRules = new Set();
  this.recursiveRules = new Set();
}

Stratum.prototype.toString =
  function ()
  {
    return `{stratum id:${this.id} preds:${this.preds.join(",")}}`;
  }

function makeStratum(name2pred)
{
  return function (scPreds, id)
  {
    const stratum = new Stratum(id, scPreds);
    for (const pred of scPreds)
    {
      pred.stratum = stratum;
      outer: for (const rule of pred.rules)
      {
        for (const atom of rule.bodyAtoms())
        {
          const bodyPred = name2pred.get(atom.pred);
          stratum.dependsOnPreds.add(bodyPred);
          if (scPreds.includes(bodyPred))
          {
            stratum.recursiveRules.add(rule);
            continue outer;
          }
        }
        stratum.nonRecursiveRules.add(rule);
      }
    }
    return stratum;
  }
}

export function analyzeProgram(exp)
{
  const program = structuralAnalysis(exp);
  const { name2pred } = collect(program);
  const predicates = [...name2pred.values()];
  const sccPreds = topoSort(predicates);
  const strata = sccPreds.map(makeStratum(name2pred));

  const preds = sccPreds.flat();

//     negatedPreds: collectingVisitor.negatedPreds,
//     edbPreds,
//     precGraph,
//     topoPreds,
//     strata: topoPreds.map(stratumMaker)
//   };
  return { 
    program, name2pred, strata,
    preds
  };
}
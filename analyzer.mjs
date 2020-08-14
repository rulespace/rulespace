import { MutableMaps } from './common.mjs';
import { Atom, Visitor } from './parser.mjs';

class CollectingVisitor extends Visitor
  {
    pred2arity = new Map(); // pred -> arit 
    rules = [];
    pred2rules = new Map();
    precGraph = new Map(); // pred -> pred

    visitAtom(atom)
    {
      const pred = atom.pred;
      const arity = atom.arity();
      const currentArity = this.pred2arity.get(pred);
      if (currentArity === undefined)
      {
        this.pred2arity.set(pred, atom.terms.length);
      }
      else if (currentArity !== arity)
      {
        throw new Error("arity mismatch for predicate " + pred);
      }

      return true;
    }

    visitRule(rule)
    {
      this.rules.push(rule);
      
      const pred = rule.head.pred;
      MutableMaps.putJoinArray(this.pred2rules, pred, rule);

      for (const atom of rule.body)
      {
        if (atom instanceof Atom)
        {
          const bodyPred = atom.pred;
          MutableMaps.putJoinArray(this.precGraph, bodyPred, pred);
        }
      }

      return true;
    }
  }

function topoSort(G)
{

  const N = new Map();
  const sccs = [];

  function node(name)
  {
    const n = N.get(name);
    if (n)
    {
      return n;
    }
    const n_ = {name};
    N.set(name, n_);
    return n_;
  }

  let index = 0;
  const S = [];

  for (const [v, _] of G)
  {
    if (node(v).index === undefined)
    {
      strongconnect(v);
    }
  } 

  function strongconnect(v)
  {
    node(v).index = index;
    node(v).lowlink = index;
    index++;
    S.push(v);
    node(v).onStack = true;

    for (const [v, ws] of G)
    {
      for (const w of ws)
      {
        if (node(w).index === undefined)
        {
          strongconnect(w);
          node(v).lowlink = Math.min(node(v).lowlink, node(w).lowlink);
        }
        else if (node(w).onStack)
        {
          node(v).lowlink = Math.min(node(v).lowlink, node(w).index);
        }
      }
    }
    
    if (node(v).lowlink === node(v).index)
    {
      const scc = [];
      let w;
      do
      {
        w = S.pop();
        node(w).onStack = false;
        scc.push(w);
      }
      while (w !== v)
      sccs.push(scc);
    }
  }
  return sccs.reverse();
}
 
 
export function analyzeProgram(program)
{
  const collectingVisitor = new CollectingVisitor();
  program.visit(collectingVisitor);

  const precGraph = collectingVisitor.precGraph;
  const topoPreds = topoSort(precGraph); 

  return {
    pred2arity: collectingVisitor.pred2arity, 
    predicates: [...collectingVisitor.pred2arity.keys()],
    pred2rules: collectingVisitor.pred2rules,
    rules: collectingVisitor.rules,
    precGraph,
    topoPreds,
    strata: topoPreds.map(stratum => ({ predsWithRules: stratum.map(pred => [pred, collectingVisitor.pred2rules.get(pred)])}))
  };
}

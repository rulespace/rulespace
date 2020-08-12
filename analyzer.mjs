import { Visitor } from './parser.mjs';

class CollectingVisitor extends Visitor
  {
    pred2arity = new Map(); // name -> arit 
    rules = [];
    pred2rules = new Map();
    
    
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
      const currentRules = this.pred2rules.get(pred);
      if (currentRules === undefined)
      {
        this.pred2rules.set(pred, [rule]);
      }
      else
      {
        currentRules.push(rule);
      }
      return true;
    }
  }
 
export function analyzeProgram(program)
{
  const collectingVisitor = new CollectingVisitor();
  program.visit(collectingVisitor);
  return {
    pred2arity: collectingVisitor.pred2arity, 
    predicates: [...collectingVisitor.pred2arity.keys()],
    pred2rules: collectingVisitor.pred2rules,
    rules: collectingVisitor.rules
  };
}

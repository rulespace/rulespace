import { Visitor } from './parser.mjs';

class CollectingVisitor extends Visitor
  {
    predicates = new Map(); // name -> arity
    pred2rules = new Map();
    
    visitAtom(atom)
    {
      const pred = atom.pred;
      const arity = atom.arity();
      const currentArity = this.predicates.get(pred);
      if (currentArity === undefined)
      {
        this.predicates.set(pred, atom.terms.length);
      }
      else if (currentArity !== arity)
      {
        throw new Error("arity mismatch for predicate " + pred);
      }
      return true;
    }

    visitRule(rule)
    {
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
    predicates: collectingVisitor.predicates, 
    pred2rules: collectingVisitor.pred2rules
  };
}

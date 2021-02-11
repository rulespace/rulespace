import { assertTrue } from './common.mjs';
import { Pair, Sym, Keyword, Tuple } from './sexp-parser.mjs';
import { Program, Rule, Neg, Agg, Atom, Lit, Var } from './rsp.mjs';

export function sexp2rsp(sexps)
{
  const rules = [];
  for (const sexp of sexps)
  {
    if (sexp instanceof Pair)
    {
      if ((sexp.car instanceof Sym) && sexp.car.name === 'rule')
      {
        rules.push(compileRule(sexp));
      }
      else
      {
        throw new Error("cannot handle " + sexp);
      }
      }
    else
    {
      throw new Error("cannot handle " + sexp);
    }
  }
  return new Program(rules);
}

function compileRule(ruleExp)
{
  const headExp = ruleExp.cdr.car;
  let bodyExps = ruleExp.cdr.cdr;
  const head = compileAtom(headExp);
  const body = [...bodyExps].map(compileTerm);
  return new Rule(head, body);
}

function compileAtom(tuple)
{
  const pred = tuple.pred.name;
  const termExps = [...tuple.terms];
  const terms = [];
  while (termExps.length > 0)
  {
    const termExp = termExps.shift();
    if (termExp instanceof Keyword)
    {
      const aggregator = termExp.name;
      const aggregand = compileTerm(termExps.shift());
      terms.push(new Agg(aggregator, aggregand));
    }
    else
    {
      terms.push(compileTerm(termExp));
    }
  }
  return new Atom(pred, terms);
}

export function compileTerm(exp)
{
  if (exp instanceof Sym)
  {
    return new Var(exp.name);
  }

  if (exp instanceof Tuple)
  {
    return compileAtom(exp);
  }

  if (exp instanceof Pair)
  {
    const rator = exp.car;
    assertTrue(rator instanceof Sym)
    switch (rator.name)
    {
      case 'quote':
      {
        const quoted = exp.cdr.car;
        const name = quoted.name; // assert Sym
        const current = symbols.get(name);
        if (current === undefined)
        {
          symbols.set(name, quoted);
          console.log("returning new " + quoted);
          return quoted;
        }
        console.log("returning existing " + current);
        return current;
      }
      case 'not':       
      {
        const negated = compileTerm(exp.cdr.car);
        return new Neg(negated);    
      }
      default: throw new Error("cannot handle " + exp);
    }
  }

  return new Lit(exp.valueOf()); // TODO: valueOf needed?
}
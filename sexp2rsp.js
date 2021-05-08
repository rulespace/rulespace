import { assertTrue } from 'common';
import { Null, Pair, Sym, Keyword, Tuple } from './sexp-reader.js';
import { Program, Rule, Neg, Agg, Atom, Lit, Var, App } from './rsp.js';

export function sexp2rsp(sexps)
{
  const rules = [];
  if (!(sexps instanceof Null))
  {
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
      else if (sexp instanceof Tuple)
      {
        rules.push(compileFact(sexp));
      }
      else
      {
        throw new Error("cannot handle " + sexp);
      }
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

function compileFact(headExp)
{
  const head = compileAtom(headExp);
  const body = [];
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

export function compileTerm(term)
{
  if (term instanceof Sym)
  {
    return new Var(term.name);
  }

  if (term instanceof Tuple)
  {
    return compileAtom(term);
  }

  if (term instanceof Pair)
  {
    const rator = term.car;
    assertTrue(rator instanceof Sym)
    switch (rator.name)
    {
      case 'quote':
      {
        const quoted = term.cdr.car;
        return new Lit(quoted.valueOf()); // TODO introduce Ref?
      }
      case 'not':  // TODO 'not' as app (= when arg is not an atom)
      {
        const negated = compileTerm(term.cdr.car);
        return new Neg(negated);    
      }
      default:
      {
        return new App(term.car, term.cdr.properToArray().map(compileTerm));
      }
      // default: throw new Error(`cannot handle term ${term} of type ${term.constructor.name}`);
    }
  }

  if (term instanceof Array)
  {
    return term.map(compileTerm);
  }

  return new Lit(term.valueOf()); // TODO: valueOf needed?
}
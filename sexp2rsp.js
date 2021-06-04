import { assertTrue } from 'common';
import { Null, Pair, Sym, Keyword, Tuple } from './sexp-reader.js';
import { Program, Rule, Neg, Agg, Atom, Lit, Var, App, Assign } from './rsp.js';

class SexpRspCompilationError extends Error
{
  constructor(msg)
  {
    super(msg);
    this.name = 'SexpRspCompilationError';
  }
}

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
  const head = compileAtom(headExp);
  const bodyExps = ruleExp.cdr.cdr;
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

function compileTerm(term)
{
  if (term instanceof Tuple)
  {
    return compileAtom(term);
  }

  return compileExp(term);
}

export function compileExp(exp)
{
  if (exp instanceof Number || exp instanceof String || exp instanceof Boolean)
  {
    return new Lit(exp.valueOf());
  }

  if (exp instanceof Sym)
  {
    return new Var(exp.name);
  }

  if (exp instanceof Pair)
  {
    const rator = exp.car;
    if (rator instanceof Sym)
    {
      const name = rator.name;
      switch (name)
      {
        case 'quote':
        {
          const quoted = exp.cdr.car;
          return new Lit(quoted.valueOf()); // TODO introduce Ref?
        }
        case 'not':  // TODO 'not' as app (= when arg is not an atom)
        {
          const atomOrExp = exp.cdr.car;
          if (atomOrExp instanceof Tuple)
          {
            const negated = compileTerm(atomOrExp);
            return new Neg(negated);      
          }
          else
          {
            return new App('not', compileTerm(atomOrExp));
          }
        }
        case '=':
        case '!=':
        case '<':
        case '>':
        case '<=':
        case '>=':
        case '+':
        case '-':
        case '*':
        case '/':
        {
          const lhs = compileTerm(exp.cdr.car);
          const rhs = compileTerm(exp.cdr.cdr.car);
          return new App(name, exp.cdr.properToArray().map(compileTerm)); // de-Symmed
        }
        case ':=':
        {
          const lhs = compileTerm(exp.cdr.car);
          const rhs = compileTerm(exp.cdr.cdr.car);
          return new Assign(name, lhs, rhs); // de-Symmed
        }
      }
    }

    return new App(compileTerm(rator), exp.cdr.properToArray().map(compileTerm));
  }

  throw new SexpRspCompilationError(`cannot handle expression ${exp} of type ${exp.constructor.name}`);
}
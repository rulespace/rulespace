/*
program = rules

rule = atom body?

body = queryParts

queryPart = exp | assign

atom = name exps agg?

exp = lit | var | atom | !exp | app

*/

export { Sym } from './sexp-reader.js';

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

  tupleArity()
  {
    return this.body.reduce((acc, exp) => ((exp instanceof Atom) || (exp instanceof Neg)) ? acc+1 : acc, 0);
  }

  toString()
  {
    return `(rule ${this.head} ${this.body.join(' ')})`;
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
    return `[${this.pred} ${this.terms.map(toTermString).join(' ')}]`;
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
  constructor(aggregator, aggregate)
  {
    this.aggregator = aggregator;
    this.aggregate = aggregate;
  }

  toString()
  {
    return `{${this.aggregator}: ${this.aggregate}}`;
  }
}

export class Lit
{
  constructor(value)
  {
    this.value = value;
  }

  toString()
  {
    const value = this.value;
    if (typeof value === "string")
    {
      return "\"" + value + "\"";
    }
    return String(value);
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

export class App // Exp
{
  constructor(operator, operands)
  {
    this.operator = operator;
    this.operands = operands;
  }

  toString()
  {
    return `(${this.operator} ${this.operands.join(' ')})`;
  }
}


function toTermString(x)
{
  if (Array.isArray(x))
  {
    return `#(${x.map(toTermString).join(' ')})`;
  }
  return String(x);
}

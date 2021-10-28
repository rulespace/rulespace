// see js-frontend/js2rsp for abstract syntax

//export { Sym } from './sexp-reader.js';

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
    if (this.body.length === 0)
    {
      return `(rule ${this.head})`;
    }
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
    if (this.terms.length === 0)
    {
      return `[${this.pred}]`;
    }
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
    if (value === true)
    {
      return "#t";
    }
    if (value === false)
    {
      return "#f";
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
    return `(${this.operator} ${this.left} ${this.right})`;
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

export class Paren // Exp
{
  constructor(exp)
  {
    this.exp = exp;
  }

  toString()
  {
    return this.exp.toString(); // sexp structure is enough (paren is 'helper' for C-like languages with notational ambiguity)
  }
}

export class Lam
{
  constructor(params, body)
  {
    this.params = params;
    this.body = body;
  }

  toString()
  {
    return `(lambda (${this.params.join(' ')}) ${this.body})`;
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

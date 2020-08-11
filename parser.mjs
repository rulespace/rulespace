import esprima from 'esprima';
import {assertTrue} from './common.mjs';


export class Lit
{
  constructor(x)
  {
    this.x = x;
  }

  visit(visitor)
  {
    visitor.visitLit(this);
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

  visit(visitor)
  {
    visitor.visitVar(this);
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

  visit(visitor)
  {
    if (visitor.visitAtom(this))
    {
      this.terms.forEach(term => term.visit(visitor));
    }
  }

  toString()
  {
    return `${this.pred}[${this.terms.join()}]`;
  }
}

export class Neg
{
  constructor(atom)
  {
    this.atom = atom;
  }

  visit(visitor)
  {
    if (visitor.visitNeg(this))
    {
      this.atom.visit(visitor);
    }
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

  visit(visitor)
  {
    if (visitor.visitAgg(this))
    {
      this.aggregand.visit(visitor);
    }
  }

  toString()
  {
    return `{${this.aggregator}: ${this.aggregand}}`;
  }
}

export class Rule
{
  constructor(head, body)
  {
    this.head = head;
    this.body = body;
  }

  visit(visitor)
  {
    if (visitor.visitRule(this))
    {
      this.head.visit(visitor);
      this.body.forEach(term => term.visit(visitor));
    }
  }

  toString()
  {
    return `${this.head}\n{\n\t${this.body.join()}\n}`;
  }
}

export class Program
{
  constructor(rules)
  {
    this.rules = rules;
  }

  visit(visitor)
  {
    if (visitor.visitProgram(this))
    {
      this.rules.forEach(rule => rule.visit(visitor));
    }
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

  visit(visitor)
  {
    if (visitor.visitAssign(this))
    {
      this.left.visit(visitor);
      this.right.visit(visitor);
    }
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

  visit(visitor)
  {
    if (visitor.visitBin(this))
    {
      this.left.visit(visitor);
      this.right.visit(visitor);
    }
  }

  toString()
  {
    return `${this.left}${this.operator}${this.right}`;
  }
}

export class Visitor
{

  visitNode(node)
  {
    return true;
  }

  visitVar(vr)
  {
    return this.visitNode(vr);
  }

  visitLit(lit)
  {
    return this.visitNode(lit);
  }

  visitAgg(agg)
  {
    return this.visitNode(agg);
  }

  visitAssign(assign)
  {
    return this.visitNode(assign);
  }

  visitAtom(atom)
  {
    return this.visitNode(atom);
  }

  visitNeg(neg)
  {
    return this.visitNode(neg);
  }

  visitProgram(program)
  {
    return this.visitNode(program);
  }

  visitRule(rule)
  {
    return this.visitNode(rule);
  }

  visitBin(bin)
  {
    return this.visitNode(bin);
  }
}

export function parseProgram(dslProgramSrc)
{
  const jsProgram = esprima.parseScript(dslProgramSrc);
  const rules = [];
  for (let i = 0; i < jsProgram.body.length; i++)
  {
    if (jsProgram.body[i+1].type === "BlockStatement")
    {
      const rule = parseRule(jsProgram.body[i].expression, jsProgram.body[++i].body[0].expression.expressions);
      rules.push(rule);
    }
    else
    {
      console.error(jsProgram.body[i]);
      throw new Error("parse program error");  
    }
  }
  const program = new Program(rules);
  return program;
}

function parseRule(headExp, bodyExps)
{
  const head = parseAtom(headExp);
  const body = bodyExps.map(parseTerm);
  return new Rule(head, body);
}

function parseTerm(exp)
{
  if (exp.type === "Identifier")
  {
    return new Var(exp.name);
  }
  if (exp.type === "Literal")
  {
    return new Lit(exp.value);
  }

  if (exp.type === "MemberExpression")
  {
    return parseAtom(exp);
  }

  if (exp.type === "BinaryExpression")
  {
    const operator = exp.operator;
    const left = parseTerm(exp.left);
    const right = parseTerm(exp.right);
    return new Bin(operator, left, right);
  }

  if (exp.type === "AssignmentExpression")
  {
    const operator = exp.operator;
    const left = parseTerm(exp.left);
    const right = parseTerm(exp.right);
    return new Assign(operator, left, right);
  }

  if (exp.type === "ObjectExpression") // only in head
  {
    const aggregator = exp.properties[0].key.name;
    const aggregand = parseTerm(exp.properties[0].value);
    return new Agg(aggregator, aggregand);
  }

  console.error(exp);
  throw new Error("parse term error");
}

function parseAtom(exp)
{
  assertTrue(exp.type === "MemberExpression");
  const name = exp.object.name;
  if (exp.property.type === "SequenceExpression")
  {
    const terms = exp.property.expressions.map(parseTerm);
    return new Atom(name, terms);  
  }
  const term = parseTerm(exp.property);
  return new Atom(name, [term]);
}

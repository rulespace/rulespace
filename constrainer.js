import { App, Assign, Atom, Lit, Neg, Var } from './rsp.js';

class Constraints
{
  constructor(bindings, constraints)
  {
    this.atomBindings = bindings;
    this.atomConstraints = constraints;
  }

  atom2bindings(atom)
  {
    return this.atomBindings.get(atom);
  }

  atom2constraints(atom)
  {
    return this.atomConstraints.get(atom);
  }

}

export function computeConstraints(program)
{
  const bindings = new Map();
  const constraints = new Map();
  program.rules.map(rule => handleRule(rule, bindings, constraints));
  return new Constraints(bindings, constraints);
}

function handleRule(rule, bindings, constraints)
{
  const compileEnv = new Map();
  handleRuleBody(rule, compileEnv, bindings, constraints);
}

function handleRuleBody(rule, compileEnv, bindings, constraints)
{
  rule.body.forEach((atom, i) => 
  {
    if (atom instanceof Atom)
    {
      return handleAtom(atom, i, rule, compileEnv, bindings, constraints);  
    }
  
    if (atom instanceof Neg)
    {
      return handleNegAtom(atom, i, rule, compileEnv, bindings, constraints);  
    }
  
    if (atom instanceof App)
    {
      return handleApplicationAtom(atom, i, rule, compileEnv, bindings, constraints);
    }
  
    if (atom instanceof Assign)
    {
      return handleAssignmentAtom(atom, i, rule, compileEnv, bindings, constraints);
    }
  
    if (atom instanceof Lit)
    {
      return handleLitAtom(atom, i, rule, compileEnv, bindings, constraints);
    }
  
    throw new Error(`cannot handle ${body[i]} of type ${body[i].constructor.name} in ${rule}`);
  });  
}

function handleAtom(atom, i, rule, compileEnv, bindings, constraints)
{
  const atomConstraints = [];
  const atomBindings = new Map();
  compilePositiveAtom(atom, [], compileEnv, atomBindings, atomConstraints);
  constraints.set(atom, atomConstraints);
  bindings.set(atom, atomBindings);
  for (const [name, constraintValue] of atomBindings)
  {
    compileEnv.set(name, name);
  }
}

function handleNegAtom(atom, i, rule, compileEnv, bindings, constraints)
{
  const posAtom = atom.atom; // the negated atom (which is positive)
  posAtom.terms.forEach((term, i) => {
    if (term instanceof Var) {
      if (compileEnv.has(term.name))
      {
      }
      else 
      {
        throw new Error(`unbound variable ${term.name} in negation in ${rule}`);
      }
    }
    else if (term instanceof Lit)
    {
    }
    else
    {
      throw new Error();
    }
  });
}

function handleApplicationAtom(atom, i, rule, compileEnv, bindings, constraints)
{
}

function handleAssignmentAtom(atom, i, rule, compileEnv, bindings, constraints)
{
}

function handleLitAtom(atom, i, rule, compileEnv, bindings, constraints)
{
}


function compilePositiveAtom(atom, target, compileEnv, atomBindings, constraints)
{
  // bindings: name -> index
  // bindings are things that are not yet named (in conditions)
  // compileEnv is read-only
  atom.terms.forEach((term, i) =>
  {
    if (term instanceof Var)
    {
      if (term.name !== '_')
      {
        if (compileEnv.has(term.name))
        {
          constraints.push(new EqConstraint(new Index([...target, i]), term));
        }
        else if (atomBindings.has(term.name)) // this var was already locally encountered, e.g. 2nd 'a' in [I a x a]
        {
          constraints.push(new EqConstraint(new Index([...target, i]), atomBindings.get(term.name)));
        }
        else
        {
          // not encountered before (locally, externally): bind
          atomBindings.set(term.name, new Index([...target, i]));
        }
      }
    }
    else if (term instanceof Lit)
    {
      constraints.push(new EqConstraint(new Index([...target, i]), term));
    }
    else if (term instanceof Atom) // functor
    {
      constraints.push(new PredElementConstraint(new Index([...target, i]), new Pred(term.pred)));
      compilePositiveAtom(term, [...target, i], compileEnv, atomBindings, constraints);
    }
    else
    {
      throw new Error(`cannot handle ${term} of type ${term.constructor.name} in ${atom}`);
    }
  })
}

export class Index
{
  constructor(indices)
  {
    this.indices = [...indices];
  }

  toString()
  {
    return `[${this.indices.join()}]`;
  }
}

// export class Var
// {
//   constructor(name)
//   {
//     this.name = name;
//   }

//   toString()
//   {
//     return this.name;
//   }
// }

// export class Constant
// {
//   constructor(value)
//   {
//     this.value = value;
//   }

//   toString()
//   {
//     return String(this.value);
//   }
// }

export class Pred
{
  constructor(pred)
  {
    this.pred = pred;
  }

  toString()
  {
    return `[${this.pred}]`;
  }
}

export class EqConstraint
{
  constructor(x, y)
  {
    this.x = x;
    this.y = y;
  }

  toString()
  {
    return `${this.x} === ${this.y}`
  }
}

export class PredElementConstraint
{
  constructor(x, pred)
  {
    this.x = x;
    this.pred = pred;
  }

  toString()
  {
    return `${this.x} ∈ ${this.pred}`
  }

}
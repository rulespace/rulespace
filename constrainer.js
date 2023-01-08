import { assertTrue } from './deps.ts';
import { App, Assign, Atom, Lit, Neg, Var } from './rsp.js';


export class CPos
{
  constructor(indices)
  {
    this.indices = [...indices];
  }

  equals(x)
  {
    return x instanceof CPos
      && equals(this.indices, x.indices);
  }

  toString()
  {
    return `[${this.indices.join()}]`;
  }
}

export class CVar
{
  constructor(name)
  {
    this.name = name;
  }

  equals(x)
  {
    return x instanceof CVar
      && this.name === x.name;
  }

  toString()
  {
    return this.name;
  }
}

export class CLit
{
  constructor(value)
  {
    this.value = value;
  }

  equals(x)
  {
    return x instanceof CLit
      && this.value === x.value;
  }

  toString()
  {
    return String(this.value);
  }
}

export class CPred
{
  constructor(pred)
  {
    this.pred = pred;
  }

  equals(x)
  {
    return x instanceof CPred
      && this.pred === x.pred;
  }

  toString()
  {
    return `[${this.pred}]`;
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
  const left = atom.left;
  assertTrue(left instanceof Var);
  compileEnv.set(left.name, left.name);
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
          constraints.push(new EqConstraint(new CPos([...target, i]), new CVar(term.name)));
        }
        else if (atomBindings.has(term.name)) // this var was already locally encountered, e.g. 2nd 'a' in [I a x a]
        {
          constraints.push(new EqConstraint(new CPos([...target, i]), atomBindings.get(term.name)));
        }
        else
        {
          // not encountered before (locally, externally): bind
          atomBindings.set(term.name, new CPos([...target, i]));
        }
      }
    }
    else if (term instanceof Lit)
    {
      constraints.push(new EqConstraint(new CPos([...target, i]), new CLit(term.value)));
    }
    else if (term instanceof Atom) // functor
    {
      constraints.push(new ElementOfConstraint(new CPos([...target, i]), new CPred(term.pred)));
      compilePositiveAtom(term, [...target, i], compileEnv, atomBindings, constraints);
    }
    else
    {
      throw new Error(`cannot handle ${term} of type ${term.constructor.name} in ${atom}`);
    }
  })
}

class Constraints
{
  constructor(bindings, constraints)
  {
    this.a2b = bindings;
    this.a2c = constraints;
  }

  atom2constraints()
  {
    return this.a2c;
  }

  atomBindings(atom)
  {
    return this.a2b.get(atom);
  }

  atomConstraints(atom)
  {
    return this.a2c.get(atom);
  }

  toString()
  {
    return `bindings \n${[...this.a2b.entries()].map(([k,v]) => `${k} -> ${v}` ).join('\n')}
constraints \n${[...this.a2c.entries()].map(([k,v]) => `${k} -> ${v.join(' ')}` ).join('\n')}`;
  }

}

function equals(x, y)
{
  if (x === y)
  {
    return true;
  }

  if (Array.isArray(x))
  {
    if (Array.isArray(y) && x.length === y.length)
    {
      for (let i = 0; i < x.length; i++)
      {
        if (!equals(x[i], y[i]))
        {
          return false;
        }
      }
      return true;   
    }
    return false;
  }
  return x.equals && x.equals(y);
}

class Index
{
  constructor(constraints, varNames)
  {
    this.constraints = constraints;
    this.varNames = varNames;
  }

  equals(x)
  {
    return x instanceof Index
      && equals(this.constraints, x.constraints);
  }

  arity() 
  {
    return this.varNames.length;
  }

  toString()
  {
    return `{index ${this.constraints.join()}}`
  }
}

export class EqConstraint
{
  constructor(left, right)
  {
    this.left = left;
    this.right = right;
  }

  equals(x)
  {
    return x instanceof EqConstraint
      && equals(this.left, x.left)
      && equals(this.right, x.right)
  }

  toString()
  {
    return `{${this.left} === ${this.right}}`;
  }
}

export class ElementOfConstraint
{
  constructor(left, right)
  {
    this.left = left;
    this.right = right;
  }

  equals(x)
  {
    return x instanceof ElementOfConstraint
      && equals(this.left, x.left)
      && equals(this.right, x.right)
  }

  toString()
  {
    return `{${this.left} ∈ ${this.right}}`;
  }
}

export class EqIndexConstraint
{
  constructor(left, right)
  {
    this.left = left;
    this.right = right;
  }

  equals(x)
  {
    return x instanceof EqIndexConstraint
      && equals(this.left, x.left)
      && equals(this.right, x.right)
  }

  toString()
  {
    return `{${this.left} === ${this.right}}`;
  }
}

export class ElementOfIndexConstraint
{
  constructor(left, right)
  {
    this.left = left;
    this.right = right;
  }

  equals(x)
  {
    return x instanceof ElementOfIndexConstraint
      && equals(this.left, x.left)
      && equals(this.right, x.right)
  }

  toString()
  {
    return `{${this.left} ∈ ${this.right}}`;
  }
}

export function computeIndexes(constraints)
{
  const pred2indexes = new Map();
  const atom2index = new Map();
  const atom2indexedConstraints = new Map();
  const atom2residualConstraints = new Map();
  
  for (const [atom, atomConstraints] of constraints.atom2constraints().entries())
  {
    const varNames = [];
    const indexConstraints = [];
    atom2indexedConstraints.set(atom, []);
    atom2residualConstraints.set(atom, []);
    for (const atomConstraint of atomConstraints)
    {
      if (atomConstraint instanceof EqConstraint)
      {
        if (atomConstraint.left instanceof CPos)
        {
          if (atomConstraint.right instanceof CVar)
          {
            const varName = atomConstraint.right.name;
            if (!varNames.includes(varName))
            {
              varNames.push(varName);
            }
            indexConstraints.push(new EqIndexConstraint(atomConstraint.left, new CVar(`v${varNames.indexOf(varName)}`)));
            atom2indexedConstraints.get(atom).push(atomConstraint);
          }
          else if (atomConstraint.right instanceof CLit)
          {
            indexConstraints.push(new EqIndexConstraint(atomConstraint.left, atomConstraint.right));
            atom2indexedConstraints.get(atom).push(atomConstraint);
          }
          else 
          {
            atom2residualConstraints.get(atom).push(atomConstraint);            
          }
        }
      }
      else
      {
        atom2residualConstraints.get(atom).push(atomConstraint);
      }
    }
    if (!pred2indexes.has(atom.pred))
    {
      pred2indexes.set(atom.pred, []);
    }
    if (indexConstraints.length > 0)
    {
      const theIndex = new Index(indexConstraints, varNames);
      const indexesForPred = pred2indexes.get(atom.pred);
      if (!indexesForPred.find(x => equals(x, theIndex)))
      {
        pred2indexes.get(atom.pred).push(theIndex);
      }
      // console.log(`*** ${atom} -> ${theIndex}`);
      atom2index.set(atom, theIndex);  
    }
  }
  return new Indexes(pred2indexes, atom2indexedConstraints, atom2residualConstraints, atom2index);
}

class Indexes
{
  constructor(pred2indexes, atom2indexedConstraints, atom2residualConstraints, atom2index)
  {
    this.p2i = pred2indexes;
    this.a2ic = atom2indexedConstraints;
    this.a2rc = atom2residualConstraints; 
    this.a2i = atom2index;
  }

  toString()
  {
    return `
    pred2indexes\n${[...this.p2i.entries()].map(([k,v]) => `${k} -> ${[...v].join(' ')}` ).join('\n')}
    atom2indexedConstraints\n${[...this.a2ic.entries()].map(([k,v]) => `${k} -> ${[...v].join(' ')}` ).join('\n')}
    atom2residualConstraints\n${[...this.a2rc.entries()].map(([k,v]) => `${k} -> ${[...v].join(' ')}` ).join('\n')}    
    atom2index\n${[...this.a2i.entries()].map(([k,v]) => `${k} -> ${v}` ).join('\n')}    
    `;
  }
}
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

export class Var
{
  constructor(name)
  {
    this.name = name;
  }

  toString()
  {
    return this.name;
  }
}

export class Constant
{
  constructor(value)
  {
    this.value = value;
  }

  toString()
  {
    return String(this.value);
  }
}

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
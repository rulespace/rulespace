import {Sets} from './common.mjs';

export {
  assertTrue, Maps, Sets, MutableSets, Arrays
} from './common.mjs';

export class Product
{

  static members = [];
  _outtuple = null;

  constructor(rule, tuples)
  {
    for (const member of Product.members)
    {
      if (member.rule === rule && Sets.equals(member.tuples, tuples))
      {
        return member;
      }
    }
    this.rule = rule;
    this.tuples = tuples;
    this._id = Product.members.length;
    Product.members.push(this);
  }
}

export class ProductGB
{

  static members = [];
  _outgb = null;

  constructor(tuples, value)
  {
    for (const member of ProductGB.members)
    {
      if (member.rule === rule && Sets.equals(member.tuples, tuples))
      {
        return member;
      }
    }
    this.rule = rule;
    this.tuples = tuples;
    this.value = value;
    this._id = ProductGB.members.length;
    ProductGB.members.push(this);
  }
}

export class TuplePartition
{
  table = new Map();

  constructor()
  {
  }

  add(tuple)
  {
    const key = tuple.constructor;
    const currentValue = this.table.get(key);
    if (currentValue === undefined)
    {
      this.table.set(key, [tuple]);
    }
    else
    {
      currentValue.push(tuple);
    }
  }

  get(predicate)
  {
    return this.table.get(predicate);
  }
}


export function* productsGB()
{
  yield* ProductGB.members;
}

export function* products()
{
  yield* Product.members;
}


export function atomString(predicateName, ...termValues)
{
  return `${predicateName}(${termValues.map(termString).join(",")})`;
}

export function termString(termValue)
{
  if (typeof termValue === "string")
  {
    return "'" + termValue + "'";
  }

  return String(termValue);
}


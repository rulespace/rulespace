import {Sets} from './common.mjs';

export {
  assertTrue, Maps, Sets, Arrays
} from './common.mjs';

export class ProductGB
{

  static members = [];
  _outgb = null;

  constructor(tuples, env)
  {
    for (const member of ProductGB.members)
    {
      if (Sets.equals(member.tuples, tuples))
      {
        return member;
      }
    }
    this.tuples = tuples;
    this.env = env;
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


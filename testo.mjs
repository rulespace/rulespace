import {
  assertTrue, Maps, Arrays,
  ProductGB, productsGB, TuplePartition,
  atomString, termString
} from './scriptlog-common.mjs';

export class X
{

  static members = [];
  _outproducts = new Set();

  constructor(t0)
  {
    for (const member of X.members)
    {
      if (Object.is(member.t0, t0))
      {
        return member;
      }
    }
    this.t0 = t0;
    this._id = X.members.length;
    X.members.push(this);
  }

  toString()
  {
    return atomString("X", this.t0);
  }
}

export class I
{

  static members = [];
  _outproducts = new Set();

  constructor(t0, t1)
  {
    for (const member of I.members)
    {
      if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
      {
        return member;
      }
    }
    this.t0 = t0;
    this.t1 = t1;
    this._id = I.members.length;
    I.members.push(this);
  }

  toString()
  {
    return atomString("i", this.t0, this.t1);
  }
}

export class R
{
  static members = [];
  _outproducts = new Set();

  constructor(t0, t1)
  {
    for (const member of R.members)
    {
      if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
      {
        return member;
      }
    }
    this.t0 = t0;
    this.t1 = t1;
    this._id = R.members.length;
    R.members.push(this);
  }

  toString()
  {
    return atomString("r", this.t0, this.t1);
  }
}

// (R x sum<z>) :- (X x) (I x y), z = y*y 
const Rule1 =
{
  name : 'r1',
  
  fire(deltaPos, deltaTuples)
  {
    const updates = new Map(); // groupby -> additionalValues

    for (const tuple0 of (deltaPos === 0 ? deltaTuples : X.members))
    {
      const x = tuple0.t0;
      for (const tuple1 of (deltaPos === 1 ? deltaTuples : I.members))
      {
        if (tuple1.t0 === x)
        {
          const y = tuple1.t1;

          //assign
          const z = y * y;

          const ptuples = new Set([tuple0, tuple1]);
          const productGB = new ProductGB(ptuples, z);
          const groupby = new Rule1GB(x);

          if (productGB._outgb === groupby) // 'not new': TODO turn this around
          {
            // already contributes, do nothing
          }
          else
          {
            const currentAdditionalValues = updates.get(groupby);
            if (!currentAdditionalValues)
            {
              updates.set(groupby, [z]);
            }
            else
            {
              currentAdditionalValues.push(z);
            }
            for (const tuple of ptuples)
            {
              tuple._outproducts.add(productGB);
            }
            productGB._outgb = groupby;
          }
        }
      }
    }
    
    // bind head (R x sum<z>)
    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple;
      const currentValue = currentResultTuple === null ? 0 : currentResultTuple.t1;
      const updatedValue = additionalValues.reduce((acc, val) => acc + val, currentValue);
      const updatedResultTuple = new R(groupby.x, updatedValue);  
      groupby._outtuple = updatedResultTuple;
    }
  }
}

class Rule1GB
{
  static members = [];
  _outtuple = null;

  constructor(x)
  {
    for (const member of Rule1GB.members)
    {
      if (Object.is(member.x, x))
      {
        return member;
      }
    }
    this.x = x;
    this._id = Rule1GB.members.length;
    Rule1GB.members.push(this);
  }

  rule()
  {
    return Rule1;
  }

  toString()
  {
    return atomString('r', this.x, ({toString: () => "sum<z>"}));
  }
}

function* tuples()
{
  yield* X.members;
  yield* I.members;
  yield* R.members;
}

function* groupbys()
{
  yield* Rule1GB.members;
}


export function addTuples(edbTuples)
{
  const partition = new TuplePartition();
  for (const edbTuple of edbTuples)
  {
    partition.add(edbTuple);
  }
  // stratum 0: preds X I; rules Rule1
    // pred X
    const Xtuples = partition.get(X);
      // Rule 1: (R x sum<z>) :- *RECENT (X x)* (I x y), z = y*y 
      Rule1.fire(0, Xtuples);

    // pred I
    const Ituples = partition.get(I);
      // Rule 1: (R x sum<z>) :- (X x) *(I x y)*, z = y*y 
      Rule1.fire(1, Ituples);
}

export function toDot()
{
  function tupleTag(tuple)
  {
    return tuple.constructor.name + tuple._id;
  }

  function productTag(product)
  {
    return "p" + product._id;
  }

  function groupbyTag(gb)
  {
    return gb.rule().name + gb._id;
  }
  
  let sb = "digraph G {\nnode [style=filled,fontname=\"Roboto Condensed\"];\n";

  for (const tuple of tuples())
  {
    const t = tupleTag(tuple);
    sb += `${t} [shape=box label="${tuple}"];\n`;
    for (const product of tuple._outproducts)
    {
      sb += `${t} -> ${productTag(product)};\n`;    
    }
  }

  for (const productGB of productsGB())
  {
    const p = productTag(productGB);
    sb += `${p} [label="${productGB.value}"];\n`;
    sb += `${p} -> ${groupbyTag(productGB._outgb)};\n`;    
  }

  for (const groupby of groupbys())
  {
    const gb = groupbyTag(groupby);
    sb += `${gb} [shape=diamond label="${groupby}"];\n`;
    const tuple = groupby._outtuple;
    if (tuple)
    {
      sb += `${gb} -> ${tupleTag(tuple)};\n`;
    }
  }
  sb += "}";
  return sb;
}

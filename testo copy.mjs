import {
  assertTrue, Maps, Sets, Arrays,
  atomString, termString,
} from './scriptlog-common.mjs';

export class X
{

  static members = [];
  _outproducts = new Set();

  constructor(x)
  {
    for (const member of X.members)
    {
      if (Object.is(member.x, x))
      {
        return member;
      }
    }
    this.x = x;
    this._id = X.members.length;
    X.members.push(this);
  }

  toString()
  {
    return atomString("x", this.x);
  }
}

export class I
{

  static members = [];
  _outproducts = new Set();

  constructor(x, y)
  {
    for (const member of I.members)
    {
      if (Object.is(member.x, x) && Object.is(member.y, y))
      {
        return member;
      }
    }
    this.x = x;
    this.y = y;
    this._id = I.members.length;
    I.members.push(this);
  }

  toString()
  {
    return atomString("i", this.x, this.y);
  }
}

export class R
{
  static members = [];
  _outproducts = new Set();

  constructor(x, z)
  {
    for (const member of R.members)
    {
      if (Object.is(member.x, x) && Object.is(member.z, z))
      {
        return member;
      }
    }
    this.x = x;
    this.z = z;
    this._id = R.members.length;
    R.members.push(this);
  }

  toString()
  {
    return atomString("r", this.x, this.z);
  }
}

// const stratifiedPredicates = [[X, I], [R]];
// const predicates = stratifiedPredicates.flat();
// const predicates = [[X, I], [R]];

// (R x sum<z>) :- (X x) (I x y), z = y*y 
const Rule1 =
{
  name : 'r1',
  
  GroupBy : class
  {
    static members = [];
    _outtuple = null;

    constructor(x)
    {
      for (const member of Rule1.GroupBy.members)
      {
        if (Object.is(member.x, x))
        {
          return member;
        }
      }
      this.x = x;
      this._id = Rule1.GroupBy.members.length;
      Rule1.GroupBy.members.push(this);
    }

    rule()
    {
      return Rule1;
    }

    toString()
    {
      return atomString('r', this.x, ({toString: () => "sum<z>"}));
    }
  },

  // fire with delta tuples for deltaPos
  fire(deltaPos, deltaTuples)
  {
    const wl0 = [[new Map(), []]]; // env + ptuples
    
    // atom 0 (X x) 
    const wl1 = [];
    for (const [env, ptuples] of wl0)
    {
      for (const Xtuple of (deltaPos === 0 ? deltaTuples : X.members))
      {
        // term 0 var 'x' [unbound]
        const x = Xtuple.x;
        wl1.push([Maps.put(env, 'x', x), Arrays.push(ptuples, Xtuple)]); // mutation iso. functional?
      }  
    }

    //atom 1 (I x y)
    const wl2 = [];
    for (const [env, ptuples] of wl1)
    {
      const wl2_1 = [];
      for (const Ituple of (deltaPos === 1 ? deltaTuples : I.members))
      {
        // term 0 var 'x' [bound]
        const x = Ituple.x;
        const existingx = env.get('x');
        if (existingx === x)
        {
          wl2_1.push([env, Ituple]);
        }
      }
      
      // term 1 var 'y' [unbound]
      for (const [env, Ituple] of wl2_1)
      {
        const y = Ituple.y;
        wl2.push([Maps.put(env, 'y', y), Arrays.push(ptuples, Ituple)]); // mutation?
      }
    }
    
    // clause 2 z = y*y [unbound]
    const wl3 = [];
    for (const [env, ptuples] of wl2)
    {
      const y = env.get('y');
      wl3.push([Maps.put(env, 'z', y*y), ptuples]); // mutation?
    }

    /// bind head (R x sum<z>)
    const updates = new Map(); // groupby -> additionalValues
    for (const [env, ptuples] of wl3)
    {
      const x = env.get('x');
      const z = env.get('z');
      const productGB = new ProductGB(new Set(ptuples), env);
      const groupby = new Rule1.GroupBy(x);

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
          tuple2product(tuple, productGB); 
        }
        product2groupby(productGB, groupby);
      }
    }

    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple; // should be API
      const currentValue = currentResultTuple === null ? 0 : currentResultTuple.z;
      const updatedValue = additionalValues.reduce((acc, val) => acc + val, currentValue);
      const updatedResultTuple = new R(groupby.x, updatedValue);  
      groupby2tuple(groupby, updatedResultTuple);
    }
  },
}


class ProductGB
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

function* tuples()
{
  yield* X.members;
  yield* I.members;
  yield* R.members;
}

function* productsGB()
{
  yield* ProductGB.members;
}

function* groupbys()
{
  yield* Rule1.GroupBy.members;
}

function tuple2product(tuple, product)
{
  tuple._outproducts.add(product);
}

function product2groupby(product, groupby) // should become method
{
  assertTrue(product._outgb === null);
  product._outgb = groupby;
}

function product2tuple(product, tuple)
{

}

function groupby2tuple(groupby, tuple)
{
  groupby._outtuple = tuple;
}

class TuplePartition
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
    sb += `${p} [label="${[...productGB.env.entries()].map(entry => entry[0]+":"+termString(entry[1]))}"];\n`;
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


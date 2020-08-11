import {
  assertTrue, Maps, Sets, Arrays,
  ProductGB, productsGB, TuplePartition,
  atomString, termString,
} from './scriptlog-common.mjs';



export class r
{

  static members = [];
  _outproducts = new Set();

  constructor(t0,t1)
  {
    for (const member of r.members)
    {
      if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
      {
        return member;
      }
    }
    this.t0 = t0; this.t1 = t1;
    this._id = r.members.length;
    r.members.push(this);
  }

  toString()
  {
    return atomString('r', this.t0, this.t1);
  }
}
  


export class x
{

  static members = [];
  _outproducts = new Set();

  constructor(t0)
  {
    for (const member of x.members)
    {
      if (Object.is(member.t0, t0))
      {
        return member;
      }
    }
    this.t0 = t0;
    this._id = x.members.length;
    x.members.push(this);
  }

  toString()
  {
    return atomString('x', this.t0);
  }
}
  


export class i
{

  static members = [];
  _outproducts = new Set();

  constructor(t0,t1)
  {
    for (const member of i.members)
    {
      if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
      {
        return member;
      }
    }
    this.t0 = t0; this.t1 = t1;
    this._id = i.members.length;
    i.members.push(this);
  }

  toString()
  {
    return atomString('i', this.t0, this.t1);
  }
}
  

/*
 r[X,{sum: Z}]
{
	x[X],i[X,Y],Z=Y*Y
}
*/  
const Rule0 =
{
  name : 'Rule0',
  
  // fire with delta tuples for deltaPos
  fire(deltaPos, deltaTuples)
  {
    const wl0 = [[new Map(), []]]; // env + ptuples
    
    
// atom 0 x[X]
const wl1 = [];
for (const [env, ptuples] of wl0)
{
  
// term 0 Var X [unbound]
for (const tuple of (deltaPos === 0 ? deltaTuples : x.members))
{
  const X = tuple.t0;
  wl1.push([Maps.put(env, 'X', X), Arrays.push(ptuples, tuple)]); // mutation iso. functional?
}  
      
}
    

// atom 1 i[X,Y]
const wl2 = [];
for (const [env, ptuples] of wl1)
{
  
// term 0 Var X [bound]      
const X = tuple.t0;
const existingx = env.get('X');
if (existingx === X)
{
  wl2_0.push([env, tuple]);
}
      

// term 1 Var Y [unbound]
for (const tuple of (deltaPos === 0 ? deltaTuples : i.members))
{
  const Y = tuple.t1;
  wl2.push([Maps.put(env, 'Y', Y), Arrays.push(ptuples, tuple)]); // mutation iso. functional?
}  
      
}
    

// assign 2 Z=Y*Y    
const wl3 = [];
for (const [env, ptuples] of wl2)
{
  const Z = env.get('y');
  wl3.push([Maps.put(env, 'Z', env.get('Y')*env.get('Y')), ptuples]); // mutation?
}    
    

    // bind head r[X,{sum: Z}]
    const updates = new Map(); // groupby -> additionalValues
    for (const [env, ptuples] of wl3)
    {
      const x = env.get('x');
      const z = env.get('z');
      const productGB = new ProductGB(new Set(ptuples), env);
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

    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple; // should be API
      const currentValue = currentResultTuple === null ? 0 : currentResultTuple.z;
      const updatedValue = additionalValues.reduce((acc, val) => acc + val, currentValue);
      const updatedResultTuple = new R(groupby.x, updatedValue);  
      groupby._outtuple = updatedResultTuple;
    }
  }
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
    return gb.rule.name() + gb._id;
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

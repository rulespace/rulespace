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

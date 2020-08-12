import {
  assertTrue, Maps, Sets, Arrays,
  ProductGB, productsGB, TuplePartition,
  atomString,
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
  

/* rule 
r[X,{sum: Z}]
{
	x[X],i[X,Y],Z=Y*Y
}  
*/
const Rule0 =
{
  name : 'Rule0',

  fire(deltaPos, deltaTuples)
  {
    const updates = new Map(); // groupby -> additionalValues

    
      // atom x[X] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : x.members))
      {
        const X = tuple0.t0;
        
      // atom i[X,Y] [conditions]
      for (const tuple1 of (deltaPos === 1 ? deltaTuples : i.members))
      {
        if (tuple1.t0 === X)
        {
          const Y = tuple1.t1;
          
      // assign Z=Y*Y
      const Z = Y*Y;

      
      // updates for r[X,{sum: Z}]
      const ptuples = new Set([tuple0,tuple1]);
      const productGB = new ProductGB(ptuples, Z);
      const groupby = new Rule1GB(X);

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [Z]);
        }
        else
        {
          currentAdditionalValues.push(Z);
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
      
    
    // bind head r[X,{sum: Z}]
    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple;
      const currentValue = currentResultTuple === null ? 0 : currentResultTuple.NaN;
      const updatedValue = additionalValues.reduce((acc, val) => acc + val, currentValue);
      const updatedResultTuple = new r(, updatedValue);  
      groupby._outtuple = updatedResultTuple;
    }
  }
} // end Rule0


class Rule0GB
{
  static members = [];
  _outtuple = null;

  constructor(t0)
  {
    for (const member of Rule0GB.members)
    {
      if (Object.is(member.t0, t0))
      {
        return member;
      }
    }
    this.t0 = t0;
    this._id = Rule0GB.members.length;
    Rule0GB.members.push(this);
  }

  rule()
  {
    return Rule0;
  }

  toString()
  {
    return atomString('r', this.t0, ({toString: () => "{sum: Z}"}));
  }
}

  

  

function* tuples()
{
  yield* r.members;
  yield* x.members;
  yield* i.members;
}

function* groupbys()
{
  yield* Rule0GB.members;
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

import {
  MutableSets,
  Product, ProductGB, products, productsGB, TuplePartition,
  atomString,
} from './scriptlog-common.mjs';



  export function r(t0, t1)
  {
    for (const member of r_.members)
    {
      if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
      {
        return member;
      }
    }
    return new r_(t0, t1);
  }
  function r_(t0, t1)
  {
    this.t0 = t0; this.t1 = t1;
    this._id = r_.members.length;
    this._outproducts = new Set();
    r_.members.push(this);
  }
  r_.members = [];
  r_.prototype.toString = function () {return atomString("r", this.t0, this.t1)};  

  


  export function x(t0)
  {
    for (const member of x_.members)
    {
      if (Object.is(member.t0, t0))
      {
        return member;
      }
    }
    return new x_(t0);
  }
  function x_(t0)
  {
    this.t0 = t0;
    this._id = x_.members.length;
    this._outproducts = new Set();
    x_.members.push(this);
  }
  x_.members = [];
  x_.prototype.toString = function () {return atomString("x", this.t0)};  

  


  export function i(t0, t1)
  {
    for (const member of i_.members)
    {
      if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
      {
        return member;
      }
    }
    return new i_(t0, t1);
  }
  function i_(t0, t1)
  {
    this.t0 = t0; this.t1 = t1;
    this._id = i_.members.length;
    this._outproducts = new Set();
    i_.members.push(this);
  }
  i_.members = [];
  i_.prototype.toString = function () {return atomString("i", this.t0, this.t1)};  

  


  export function reachable(t0, t1)
  {
    for (const member of reachable_.members)
    {
      if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
      {
        return member;
      }
    }
    return new reachable_(t0, t1);
  }
  function reachable_(t0, t1)
  {
    this.t0 = t0; this.t1 = t1;
    this._id = reachable_.members.length;
    this._outproducts = new Set();
    reachable_.members.push(this);
  }
  reachable_.members = [];
  reachable_.prototype.toString = function () {return atomString("reachable", this.t0, this.t1)};  

  


  export function link(t0, t1)
  {
    for (const member of link_.members)
    {
      if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
      {
        return member;
      }
    }
    return new link_(t0, t1);
  }
  function link_(t0, t1)
  {
    this.t0 = t0; this.t1 = t1;
    this._id = link_.members.length;
    this._outproducts = new Set();
    link_.members.push(this);
  }
  link_.members = [];
  link_.prototype.toString = function () {return atomString("link", this.t0, this.t1)};  

  


  export function reachable2(t0, t1)
  {
    for (const member of reachable2_.members)
    {
      if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
      {
        return member;
      }
    }
    return new reachable2_(t0, t1);
  }
  function reachable2_(t0, t1)
  {
    this.t0 = t0; this.t1 = t1;
    this._id = reachable2_.members.length;
    this._outproducts = new Set();
    reachable2_.members.push(this);
  }
  reachable2_.members = [];
  reachable2_.prototype.toString = function () {return atomString("reachable2", this.t0, this.t1)};  

  

/* rule [aggregates] 
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
    const newTuples = new Set();
    const updates = new Map(); // groupby -> additionalValues

    
      // atom x[X] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : x_.members))
      {
        const X = tuple0.t0;
        
      // atom i[X,Y] [conditions]
      for (const tuple1 of (deltaPos === 1 ? deltaTuples : i_.members))
      {
        if (tuple1.t0 === X)
        {
          const Y = tuple1.t1;
          
      // assign Z=Y*Y
      const Z = Y*Y;

      
      // updates for r[X,{sum: Z}]
      const ptuples = new Set([]);
      const productGB = new ProductGB(ptuples, Z);
      const groupby = new Rule0GB(X);

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
      const currentValue = currentResultTuple === null ? 0 : currentResultTuple.t1;
      const updatedValue = additionalValues.reduce((acc, val) => acc + val, currentValue);
      const updatedResultTuple = new r(groupby.t0, updatedValue);  
      if (groupby._outtuple !== updatedResultTuple)
      {
        groupby._outtuple = updatedResultTuple;
        newTuples.add(updatedResultTuple);
      }
    }
    return newTuples;
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

  

  

/* rule [no aggregates] 
reachable[X,Y]
{
	link[X,Y]
} 
*/
const Rule1 =
{
  name : 'Rule1',

  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();

    
      // atom link[X,Y] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : link_.members))
      {
        const X = tuple0.t0;
        const Y = tuple0.t1;
        
      // updates for reachable[X,Y]
      const ptuples = new Set([tuple0]);
      const product = new Product(ptuples);
      const resultTuple = reachable(X, Y);
      if (product._outtuple !== resultTuple)
      {
        product._outtuple = resultTuple;
        tuple0._outproducts.add(product);
        newTuples.add(resultTuple);
      }
    
      }
      

    return newTuples;
  }
} // end Rule1

  

/* rule [no aggregates] 
reachable2[X,Y]
{
	reachable[X,Z],link[Z,Y]
} 
*/
const Rule2 =
{
  name : 'Rule2',

  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();

    
      // atom reachable[X,Z] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : reachable_.members))
      {
        const X = tuple0.t0;
        const Z = tuple0.t1;
        
      // atom link[Z,Y] [conditions]
      for (const tuple1 of (deltaPos === 1 ? deltaTuples : link_.members))
      {
        if (tuple1.t0 === Z)
        {
          const Y = tuple1.t1;
          
      // updates for reachable2[X,Y]
      const ptuples = new Set([tuple0, tuple1]);
      const product = new Product(ptuples);
      const resultTuple = reachable2(X, Y);
      if (product._outtuple !== resultTuple)
      {
        product._outtuple = resultTuple;
        tuple0._outproducts.add(product);
        tuple1._outproducts.add(product);
        newTuples.add(resultTuple);
      }
    
        }
      }
      
      }
      

    return newTuples;
  }
} // end Rule2

  

/* rule [no aggregates] 
reachable[X,Y]
{
	reachable2[X,Y]
} 
*/
const Rule3 =
{
  name : 'Rule3',

  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();

    
      // atom reachable2[X,Y] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : reachable2_.members))
      {
        const X = tuple0.t0;
        const Y = tuple0.t1;
        
      // updates for reachable[X,Y]
      const ptuples = new Set([tuple0]);
      const product = new Product(ptuples);
      const resultTuple = reachable(X, Y);
      if (product._outtuple !== resultTuple)
      {
        product._outtuple = resultTuple;
        tuple0._outproducts.add(product);
        newTuples.add(resultTuple);
      }
    
      }
      

    return newTuples;
  }
} // end Rule3

  

function* tuples()
{
  yield* r_.members;
  yield* x_.members;
  yield* i_.members;
  yield* reachable_.members;
  yield* link_.members;
  yield* reachable2_.members;
}

function* groupbys()
{
  yield* Rule0GB.members;
}  
  

export function addTuples(edbTuples)
{
  const partition = new TuplePartition();
  for (const edbTuple of edbTuples)
  {
    partition.add(edbTuple);
  }
  
  
    // stratum 0
    // preds: link
    // non-recursive rules: 
    // recursive rules: 

    const linktuples = partition.get(link_) || new Set();
  

    // stratum 1
    // preds: i
    // non-recursive rules: 
    // recursive rules: 

    const ituples = partition.get(i_) || new Set();
  

    // stratum 2
    // preds: x
    // non-recursive rules: 
    // recursive rules: 

    const xtuples = partition.get(x_) || new Set();
  

    // stratum 3
    // preds: r
    // non-recursive rules: Rule0
    // recursive rules: 

    const rtuples = new Set();

    // Rule0 [nonRecursive]
    
      // atom 0 x[X]
      const rtuples0 = Rule0.fire(0, xtuples);
      MutableSets.addAll(rtuples, rtuples0);
    
    
      // atom 1 i[X,Y]
      const rtuples1 = Rule0.fire(1, ituples);
      MutableSets.addAll(rtuples, rtuples1);
    
  
  

    // stratum 4
    // preds: reachable2, reachable
    // non-recursive rules: Rule1
    // recursive rules: Rule2,Rule3

    const reachable2tuples = new Set();
    const reachabletuples = new Set();

    // Rule1 [nonRecursive]
    
      // atom 0 link[X,Y]
      const reachabletuples0 = Rule1.fire(0, linktuples);
      MutableSets.addAll(reachabletuples, reachabletuples0);
    
  

    // recursive rules: Rule2, Rule3
    // produce: reachable2,reachable

    
    let localreachable2 = reachable2tuples;
  
    let localreachable = reachabletuples;
  
    while (localreachable2.size > 0 || localreachable.size > 0)
    {
      
    const newreachable2 = new Set();
  
    
    const newreachable = new Set();
  
      
    // Rule2 [recursive] produces reachable2
    
        // atom 0 reachable[X,Z]
        if (localreachable.size > 0)
        {
          const reachable2tuples0 = Rule2.fire(0, localreachable);
          MutableSets.addAll(reachable2tuples, reachable2tuples0);  
          MutableSets.addAll(newreachable2, reachable2tuples0);
        }    
      
  
    
    // Rule3 [recursive] produces reachable
    
        // atom 0 reachable2[X,Y]
        if (localreachable2.size > 0)
        {
          const reachabletuples0 = Rule3.fire(0, localreachable2);
          MutableSets.addAll(reachabletuples, reachabletuples0);  
          MutableSets.addAll(newreachable, reachabletuples0);
        }    
      
  
  
      
    localreachable2 = newreachable2
  
    localreachable = newreachable
  
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
    return gb.rule().name + "gb" + gb._id;
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

  for (const product of products())
  {
    const p = productTag(product);
    sb += `${p} [label="&&"];\n`;
    sb += `${p} -> ${tupleTag(product._outtuple)};\n`;    
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

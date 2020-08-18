import {
  MutableSets,
  Product, ProductGB, products, productsGB, TuplePartition,
  atomString,
} from './scriptlog-common.mjs';



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
    this._outproducts = new Set();
    this._outproductsgb = new Set();
    reachable_.members.add(this);
  }
  reachable_.members = new Set();
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
    this._outproducts = new Set();
    this._outproductsgb = new Set();
    link_.members.add(this);
  }
  link_.members = new Set();
  link_.prototype.toString = function () {return atomString("link", this.t0, this.t1)};  

  

/* rule [no aggregates] 
reachable[X,Y]
{
	link[X,Y]
} 
*/
const Rule2 =
{
  name : 'Rule2',

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
} // end Rule2

  

/* rule [no aggregates] 
reachable[X,Y]
{
	link[X,Z],reachable[Z,Y]
} 
*/
const Rule3 =
{
  name : 'Rule3',

  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();

    
      // atom link[X,Z] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : link_.members))
      {
        const X = tuple0.t0;
        const Z = tuple0.t1;
        
      // atom reachable[Z,Y] [conditions]
      for (const tuple1 of (deltaPos === 1 ? deltaTuples : reachable_.members))
      {
        if (tuple1.t0 === Z)
        {
          const Y = tuple1.t1;
          
      // updates for reachable[X,Y]
      const ptuples = new Set([tuple0, tuple1]);
      const product = new Product(ptuples);
      const resultTuple = reachable(X, Y);
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
} // end Rule3

  

function* tuples_()
{
  yield* reachable_.members;
  yield* link_.members;
}

function* groupbys()
{
  
}  
  

  const edbTuples_ = new Set();

  export function edbTuples()
  {
    return new Set(edbTuples_);
  }  

  export function tuples()
  {
    const tuples = new Set();
    const wl = [...edbTuples_];

    while (wl.length > 0)
    {
      const tuple = wl.pop();
      if (!tuples.has(tuple))
      {
        tuples.add(tuple);
        for (const outproduct of tuple._outproducts)
        {
          wl.push(outproduct._outtuple);
        }
        for (const outproductgb of tuple._outproductsgb)
        {
          wl.push(outproductgb._outgb._outtuple);
        }
      }
    }
    return tuples;
  }
  

export function addTuples(freshEdbTuples)
{
  const partition = new TuplePartition();
  for (const edbTuple of freshEdbTuples)
  {
    if (!edbTuples_.has(edbTuple))
    {
      edbTuples_.add(edbTuple);
      partition.add(edbTuple);  
    }
  }
  
  
    // stratum 0
    // preds: link
    // non-recursive rules: 
    // recursive rules: 

    const linktuples = partition.get(link_) || new Set();
  

    // stratum 1
    // preds: reachable
    // non-recursive rules: Rule2
    // recursive rules: Rule3

    const reachabletuples = new Set();

    /* Rule2 [nonRecursive]
reachable[X,Y]
{
	link[X,Y]
}
    */
    
      // atom 0 link[X,Y]
      const Rule2tuples0 = Rule2.fire(0, linktuples);
      MutableSets.addAll(reachabletuples, Rule2tuples0);
    
  

    // recursive rules: Rule3
    // produce: reachable

    
    let localreachable = reachabletuples;
  
    while (localreachable.size > 0)
    {
      
    const newreachable = new Set();
  
      
    /* Rule3 [recursive]
reachable[X,Y]
{
	link[X,Z],reachable[Z,Y]
}
    */
    
        // atom 1 reachable[Z,Y]
        if (localreachable.size > 0)
        {
          const reachabletuples1 = Rule3.fire(1, localreachable);
          MutableSets.addAll(reachabletuples, reachabletuples1);  
          MutableSets.addAll(newreachable, reachabletuples1);
        }    
      
  
  
      
    localreachable = newreachable
  
    }

  
  
}
  

export function toDot()
{
  const tuples = [];
  function tupleTag(tuple)
  {
    let id = tuples.indexOf(tuple);
    if (id === -1)
    {
      id = tuples.length;
      tuples.push(tuple);
    }
    return tuple.constructor.name + id;
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

  for (const tuple of tuples_())
  {
    const t = tupleTag(tuple);
    sb += `${t} [shape=box label="${tuple}"];\n`;
    for (const product of tuple._outproducts)
    {
      sb += `${t} -> ${productTag(product)};\n`;    
    }
    for (const productGB of tuple._outproductsgb)
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
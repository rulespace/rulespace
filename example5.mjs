import {
  MutableSets,
  Product, ProductGB, products, productsGB, TuplePartition,
  atomString,
} from './scriptlog-common.mjs';



  export function rsum(t0, t1)
  {
    for (const member of rsum_.members)
    {
      if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
      {
        return member;
      }
    }
    return new rsum_(t0, t1);
  }
  function rsum_(t0, t1)
  {
    this.t0 = t0; this.t1 = t1;
    this._inproducts = new Set();
    this._outproducts = new Set();
    this._outproductsgb = new Set();
    rsum_.members.add(this);
  }
  rsum_.members = new Set();
  rsum_.prototype.toString = function () {return atomString("rsum", this.t0, this.t1)};  

  


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
    this._inproducts = new Set();
    this._outproducts = new Set();
    this._outproductsgb = new Set();
    i_.members.add(this);
  }
  i_.members = new Set();
  i_.prototype.toString = function () {return atomString("i", this.t0, this.t1)};  

  


  export function rmax(t0, t1)
  {
    for (const member of rmax_.members)
    {
      if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
      {
        return member;
      }
    }
    return new rmax_(t0, t1);
  }
  function rmax_(t0, t1)
  {
    this.t0 = t0; this.t1 = t1;
    this._inproducts = new Set();
    this._outproducts = new Set();
    this._outproductsgb = new Set();
    rmax_.members.add(this);
  }
  rmax_.members = new Set();
  rmax_.prototype.toString = function () {return atomString("rmax", this.t0, this.t1)};  

  


  export function rmin(t0, t1)
  {
    for (const member of rmin_.members)
    {
      if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
      {
        return member;
      }
    }
    return new rmin_(t0, t1);
  }
  function rmin_(t0, t1)
  {
    this.t0 = t0; this.t1 = t1;
    this._inproducts = new Set();
    this._outproducts = new Set();
    this._outproductsgb = new Set();
    rmin_.members.add(this);
  }
  rmin_.members = new Set();
  rmin_.prototype.toString = function () {return atomString("rmin", this.t0, this.t1)};  

  


  export function rcount(t0, t1)
  {
    for (const member of rcount_.members)
    {
      if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
      {
        return member;
      }
    }
    return new rcount_(t0, t1);
  }
  function rcount_(t0, t1)
  {
    this.t0 = t0; this.t1 = t1;
    this._inproducts = new Set();
    this._outproducts = new Set();
    this._outproductsgb = new Set();
    rcount_.members.add(this);
  }
  rcount_.members = new Set();
  rcount_.prototype.toString = function () {return atomString("rcount", this.t0, this.t1)};  

  

/* rule [aggregates] 
rsum[X,{sum: Y}]
{
	i[X,Y]
} 
*/
const Rule13 =
{
  name : 'Rule13',

  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();
    const updates = new Map(); // groupby -> additionalValues

    
      // atom i[X,Y] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : i_.members))
      {
        const X = tuple0.t0;
        const Y = tuple0.t1;
        
      // updates for rsum[X,{sum: Y}]
      const ptuples = new Set([tuple0]);
      const productGB = new ProductGB(Rule13, ptuples, Y);
      const groupby = new Rule13GB(X);

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [Y]);
        }
        else
        {
          currentAdditionalValues.push(Y);
        }
        for (const tuple of ptuples)
        {
          tuple._outproductsgb.add(productGB);
        }
        productGB._outgb = groupby;
      }

      }
      
    
    // bind head rsum[X,{sum: Y}]
    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple;
      const updatedValue = currentResultTuple === null ? additionalValues.reduce((acc, val) => acc + val, 0) : additionalValues.reduce((acc, val) => undefined, currentResultTuple.t1);
      const updatedResultTuple = new rsum(groupby.t0, updatedValue);  
      if (groupby._outtuple !== updatedResultTuple)
      {
        groupby._outtuple = updatedResultTuple;
        newTuples.add(updatedResultTuple);
      }
    }
    return newTuples;
  }
} // end Rule13


class Rule13GB
{
  static members = [];
  _outtuple = null;

  constructor(t0)
  {
    for (const member of Rule13GB.members)
    {
      if (Object.is(member.t0, t0))
      {
        return member;
      }
    }
    this.t0 = t0;
    this._id = Rule13GB.members.length;
    Rule13GB.members.push(this);
  }

  rule()
  {
    return Rule13;
  }

  toString()
  {
    return atomString('rsum', this.t0, ({toString: () => "{sum: Y}"}));
  }
}

  

  

/* rule [aggregates] 
rmax[X,{max: Y}]
{
	i[X,Y]
} 
*/
const Rule14 =
{
  name : 'Rule14',

  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();
    const updates = new Map(); // groupby -> additionalValues

    
      // atom i[X,Y] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : i_.members))
      {
        const X = tuple0.t0;
        const Y = tuple0.t1;
        
      // updates for rmax[X,{max: Y}]
      const ptuples = new Set([tuple0]);
      const productGB = new ProductGB(Rule14, ptuples, Y);
      const groupby = new Rule14GB(X);

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [Y]);
        }
        else
        {
          currentAdditionalValues.push(Y);
        }
        for (const tuple of ptuples)
        {
          tuple._outproductsgb.add(productGB);
        }
        productGB._outgb = groupby;
      }

      }
      
    
    // bind head rmax[X,{max: Y}]
    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple;
      const updatedValue = currentResultTuple === null ? additionalValues.reduce((acc, val) => Math.max(acc, val)) : additionalValues.reduce((acc, val) => Math.max(acc, val), currentResultTuple.t1);
      const updatedResultTuple = new rmax(groupby.t0, updatedValue);  
      if (groupby._outtuple !== updatedResultTuple)
      {
        groupby._outtuple = updatedResultTuple;
        newTuples.add(updatedResultTuple);
      }
    }
    return newTuples;
  }
} // end Rule14


class Rule14GB
{
  static members = [];
  _outtuple = null;

  constructor(t0)
  {
    for (const member of Rule14GB.members)
    {
      if (Object.is(member.t0, t0))
      {
        return member;
      }
    }
    this.t0 = t0;
    this._id = Rule14GB.members.length;
    Rule14GB.members.push(this);
  }

  rule()
  {
    return Rule14;
  }

  toString()
  {
    return atomString('rmax', this.t0, ({toString: () => "{max: Y}"}));
  }
}

  

  

/* rule [aggregates] 
rmin[X,{min: Y}]
{
	i[X,Y]
} 
*/
const Rule15 =
{
  name : 'Rule15',

  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();
    const updates = new Map(); // groupby -> additionalValues

    
      // atom i[X,Y] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : i_.members))
      {
        const X = tuple0.t0;
        const Y = tuple0.t1;
        
      // updates for rmin[X,{min: Y}]
      const ptuples = new Set([tuple0]);
      const productGB = new ProductGB(Rule15, ptuples, Y);
      const groupby = new Rule15GB(X);

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [Y]);
        }
        else
        {
          currentAdditionalValues.push(Y);
        }
        for (const tuple of ptuples)
        {
          tuple._outproductsgb.add(productGB);
        }
        productGB._outgb = groupby;
      }

      }
      
    
    // bind head rmin[X,{min: Y}]
    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple;
      const updatedValue = currentResultTuple === null ? additionalValues.reduce((acc, val) => Math.min(acc, val)) : additionalValues.reduce((acc, val) => Math.min(acc, val), currentResultTuple.t1);
      const updatedResultTuple = new rmin(groupby.t0, updatedValue);  
      if (groupby._outtuple !== updatedResultTuple)
      {
        groupby._outtuple = updatedResultTuple;
        newTuples.add(updatedResultTuple);
      }
    }
    return newTuples;
  }
} // end Rule15


class Rule15GB
{
  static members = [];
  _outtuple = null;

  constructor(t0)
  {
    for (const member of Rule15GB.members)
    {
      if (Object.is(member.t0, t0))
      {
        return member;
      }
    }
    this.t0 = t0;
    this._id = Rule15GB.members.length;
    Rule15GB.members.push(this);
  }

  rule()
  {
    return Rule15;
  }

  toString()
  {
    return atomString('rmin', this.t0, ({toString: () => "{min: Y}"}));
  }
}

  

  

/* rule [aggregates] 
rcount[X,{count: Y}]
{
	i[X,Y]
} 
*/
const Rule16 =
{
  name : 'Rule16',

  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();
    const updates = new Map(); // groupby -> additionalValues

    
      // atom i[X,Y] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : i_.members))
      {
        const X = tuple0.t0;
        const Y = tuple0.t1;
        
      // updates for rcount[X,{count: Y}]
      const ptuples = new Set([tuple0]);
      const productGB = new ProductGB(Rule16, ptuples, Y);
      const groupby = new Rule16GB(X);

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [Y]);
        }
        else
        {
          currentAdditionalValues.push(Y);
        }
        for (const tuple of ptuples)
        {
          tuple._outproductsgb.add(productGB);
        }
        productGB._outgb = groupby;
      }

      }
      
    
    // bind head rcount[X,{count: Y}]
    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple;
      const updatedValue = currentResultTuple === null ? additionalValues.reduce((acc, val) => acc + 1, 0) : additionalValues.reduce((acc, val) => undefined, currentResultTuple.t1);
      const updatedResultTuple = new rcount(groupby.t0, updatedValue);  
      if (groupby._outtuple !== updatedResultTuple)
      {
        groupby._outtuple = updatedResultTuple;
        newTuples.add(updatedResultTuple);
      }
    }
    return newTuples;
  }
} // end Rule16


class Rule16GB
{
  static members = [];
  _outtuple = null;

  constructor(t0)
  {
    for (const member of Rule16GB.members)
    {
      if (Object.is(member.t0, t0))
      {
        return member;
      }
    }
    this.t0 = t0;
    this._id = Rule16GB.members.length;
    Rule16GB.members.push(this);
  }

  rule()
  {
    return Rule16;
  }

  toString()
  {
    return atomString('rcount', this.t0, ({toString: () => "{count: Y}"}));
  }
}

  

  

function* tuples_()
{
  yield* rsum_.members;
  yield* i_.members;
  yield* rmax_.members;
  yield* rmin_.members;
  yield* rcount_.members;
}

function* groupbys()
{
  yield* Rule13GB.members;
  yield* Rule14GB.members;
  yield* Rule15GB.members;
  yield* Rule16GB.members;
}  

function rules()
{
  return [Rule13, Rule14, Rule15, Rule16];
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
    // preds: i
    // non-recursive rules: 
    // recursive rules: 

    const ituples = partition.get(i_) || new Set();
  

    // stratum 1
    // preds: rsum
    // non-recursive rules: Rule13
    // recursive rules: 

    const rsumtuples = new Set();

    /* Rule13 [nonRecursive]
rsum[X,{sum: Y}]
{
	i[X,Y]
}
    */
    
      // atom 0 i[X,Y]
      const Rule13tuples0 = Rule13.fire(0, ituples);
      MutableSets.addAll(rsumtuples, Rule13tuples0);
    
  
  

    // stratum 2
    // preds: rmax
    // non-recursive rules: Rule14
    // recursive rules: 

    const rmaxtuples = new Set();

    /* Rule14 [nonRecursive]
rmax[X,{max: Y}]
{
	i[X,Y]
}
    */
    
      // atom 0 i[X,Y]
      const Rule14tuples0 = Rule14.fire(0, ituples);
      MutableSets.addAll(rmaxtuples, Rule14tuples0);
    
  
  

    // stratum 3
    // preds: rmin
    // non-recursive rules: Rule15
    // recursive rules: 

    const rmintuples = new Set();

    /* Rule15 [nonRecursive]
rmin[X,{min: Y}]
{
	i[X,Y]
}
    */
    
      // atom 0 i[X,Y]
      const Rule15tuples0 = Rule15.fire(0, ituples);
      MutableSets.addAll(rmintuples, Rule15tuples0);
    
  
  

    // stratum 4
    // preds: rcount
    // non-recursive rules: Rule16
    // recursive rules: 

    const rcounttuples = new Set();

    /* Rule16 [nonRecursive]
rcount[X,{count: Y}]
{
	i[X,Y]
}
    */
    
      // atom 0 i[X,Y]
      const Rule16tuples0 = Rule16.fire(0, ituples);
      MutableSets.addAll(rcounttuples, Rule16tuples0);
    
  
  
}
  

export function removeTuples(edbTuples)
{
  const wl = [...edbTuples];

  function removeProduct(product)
  {
    for (const intuple of product.tuples)
    {
      intuple._outproducts.delete(product); 
    }
    const outtuple = product._outtuple;
    outtuple._inproducts.delete(product);
    if (outtuple._inproducts.size === 0)
    {
      wl.push(outtuple);
    }
    product._outtuple = null;
  }

  while (wl.length > 0)
  {
    const tuple = wl.pop();
    edbTuples_.delete(tuple);

    for (const product of tuple._outproducts)
    {
      removeProduct(product);     
    }
  }
}


export function reset()
{
  rsum_.members = new Set();
  i_.members = new Set();
  rmax_.members = new Set();
  rmin_.members = new Set();
  rcount_.members = new Set();
  Rule13GB.members = [];
  Rule14GB.members = [];
  Rule15GB.members = [];
  Rule16GB.members = [];

  Product.members = [];
  ProductGB.members = [];
  edbTuples_.clear();
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

  function productGBTag(product)
  {
    return "pgb" + product._id;
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
      sb += `${t} -> ${productGBTag(productGB)};\n`;    
    }
  }

  for (const product of products())
  {
    const p = productTag(product);
    sb += `${p} [label="${product.rule.name}"];\n`;
    if (product._outtuple !== null)
    {
      sb += `${p} -> ${tupleTag(product._outtuple)};\n`;    
    }
  }

  for (const productGB of productsGB())
  {
    const p = productGBTag(productGB);
    sb += `${p} [label="${productGB.rule.name} ${productGB.value}"];\n`;
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

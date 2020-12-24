import {
  MutableSets,
  Product, ProductGB,
  atomString,
} from './schemelog-common.mjs';



const IMM_EMPTY_COLLECTION = Object.freeze([]);



//////////////////////////////////////////////////
// ebd pred I(2)
// precedes: Rsum,Rmax,Rmin,Rcount
// posDependsOn: 
// negDependsOn: 
// negated: false
    

const I_members = new Set();
export function I(t0, t1)
{
  this.t0 = t0;
  this.t1 = t1;
  this._inproducts = IMM_EMPTY_COLLECTION;
  this._outproducts = new Set();
  this._outproductsgb = new Set();
}
I.prototype.toString = function () {return atomString("I", this.t0, this.t1)};  
I.prototype.get = function () {return get_I(this.t0, this.t1)};  // public API only 
I.prototype._remove = function () {I_members.delete(this)};

function get_I(t0, t1)
{
  for (const member of I_members)
  {
    if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
    {
      return member;
    }
  }
  return null;
}


function delta_add_I_tuples(proposedEdbTuples)
{
  const I_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_I(proposed.t0, proposed.t1);
    if (actual === null)  
    {
      I_tuples.push(proposed);
      I_members.add(proposed);
    }
  }
  return I_tuples;
}
  

//////////////////////////////////////////////////
// idb pred Rcount(2)
// precedes: 
// posDependsOn: I
// negDependsOn: 
// negated: false
    

const Rcount_members = new Set();
export function Rcount(t0, t1)
{
  this.t0 = t0;
  this.t1 = t1;
  this._inproducts = new Set();
  this._outproducts = new Set();
  this._outproductsgb = new Set();
}
Rcount.prototype.toString = function () {return atomString("Rcount", this.t0, this.t1)};  
Rcount.prototype.get = function () {return get_Rcount(this.t0, this.t1)};  // public API only 
Rcount.prototype._remove = function () {Rcount_members.delete(this)};

function get_Rcount(t0, t1)
{
  for (const member of Rcount_members)
  {
    if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
    {
      return member;
    }
  }
  return null;
}


function delta_add_Rcount_tuples(proposedEdbTuples)
{
  const Rcount_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_Rcount(proposed.t0, proposed.t1);
    if (actual === null)  
    {
      Rcount_tuples.push(proposed);
      Rcount_members.add(proposed);
    }
  }
  return Rcount_tuples;
}
  
/* [Rcount x {count: y}] :- [I x y] */

/* rule [aggregates] 
[Rcount x {count: y}] :- [I x y] 
*/
const Rule16 =
{
  name : 'Rule16',

  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();
    const updates = new Map(); // groupby -> additionalValues

    
      // atom [I x y] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : I_members))
      {
        const x = tuple0.t0;
        const y = tuple0.t1;
        
      // updates for [Rcount x {count: y}]
      const ptuples = new Set([tuple0]);
      const productGB = new ProductGB(Rule16, ptuples, y);
      const groupby = get_or_create_Rule16GB(x);

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [y]);
        }
        else
        {
          currentAdditionalValues.push(y);
        }
        for (const tuple of ptuples)
        {
          tuple._outproductsgb.add(productGB);
        }
        productGB._outgb = groupby;
      }

      }
      
    
    // bind head [Rcount x {count: y}]
    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple;
      const updatedValue = currentResultTuple === null ? additionalValues.reduce((acc, val) => acc + 1, 0) : additionalValues.reduce((acc, val) => undefined, currentResultTuple.t1);
      const updatedResultTuple = new Rcount(groupby.t0, updatedValue);  
      if (groupby._outtuple !== updatedResultTuple)
      {
        groupby._outtuple = updatedResultTuple;
        newTuples.add(updatedResultTuple);
        Rcount_members.add(updatedResultTuple);
      }
    }
    return newTuples;
  }
} // end Rule16


const Rule16GB_members = new Set();
function Rule16GB(t0)
{
  this.t0 = t0;
  this._outtuple = null;
}
Rule16GB.prototype.toString = function () { return atomString('Rcount', this.t0, ({toString: () => "{count: y}"})) };
Rule16GB.prototype.rule = function () { return Rule16};

function get_or_create_Rule16GB(t0)
{
  for (const member of Rule16GB_members)
  {
    if (Object.is(member.t0, t0))
    {
      return member;
    }
  }
  const gb = new Rule16GB(t0);
  Rule16GB_members.add(gb);
  return gb;
}
  

  

//////////////////////////////////////////////////
// idb pred Rmin(2)
// precedes: 
// posDependsOn: I
// negDependsOn: 
// negated: false
    

const Rmin_members = new Set();
export function Rmin(t0, t1)
{
  this.t0 = t0;
  this.t1 = t1;
  this._inproducts = new Set();
  this._outproducts = new Set();
  this._outproductsgb = new Set();
}
Rmin.prototype.toString = function () {return atomString("Rmin", this.t0, this.t1)};  
Rmin.prototype.get = function () {return get_Rmin(this.t0, this.t1)};  // public API only 
Rmin.prototype._remove = function () {Rmin_members.delete(this)};

function get_Rmin(t0, t1)
{
  for (const member of Rmin_members)
  {
    if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
    {
      return member;
    }
  }
  return null;
}


function delta_add_Rmin_tuples(proposedEdbTuples)
{
  const Rmin_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_Rmin(proposed.t0, proposed.t1);
    if (actual === null)  
    {
      Rmin_tuples.push(proposed);
      Rmin_members.add(proposed);
    }
  }
  return Rmin_tuples;
}
  
/* [Rmin x {min: y}] :- [I x y] */

/* rule [aggregates] 
[Rmin x {min: y}] :- [I x y] 
*/
const Rule15 =
{
  name : 'Rule15',

  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();
    const updates = new Map(); // groupby -> additionalValues

    
      // atom [I x y] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : I_members))
      {
        const x = tuple0.t0;
        const y = tuple0.t1;
        
      // updates for [Rmin x {min: y}]
      const ptuples = new Set([tuple0]);
      const productGB = new ProductGB(Rule15, ptuples, y);
      const groupby = get_or_create_Rule15GB(x);

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [y]);
        }
        else
        {
          currentAdditionalValues.push(y);
        }
        for (const tuple of ptuples)
        {
          tuple._outproductsgb.add(productGB);
        }
        productGB._outgb = groupby;
      }

      }
      
    
    // bind head [Rmin x {min: y}]
    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple;
      const updatedValue = currentResultTuple === null ? additionalValues.reduce((acc, val) => Math.min(acc, val)) : additionalValues.reduce((acc, val) => Math.min(acc, val), currentResultTuple.t1);
      const updatedResultTuple = new Rmin(groupby.t0, updatedValue);  
      if (groupby._outtuple !== updatedResultTuple)
      {
        groupby._outtuple = updatedResultTuple;
        newTuples.add(updatedResultTuple);
        Rmin_members.add(updatedResultTuple);
      }
    }
    return newTuples;
  }
} // end Rule15


const Rule15GB_members = new Set();
function Rule15GB(t0)
{
  this.t0 = t0;
  this._outtuple = null;
}
Rule15GB.prototype.toString = function () { return atomString('Rmin', this.t0, ({toString: () => "{min: y}"})) };
Rule15GB.prototype.rule = function () { return Rule15};

function get_or_create_Rule15GB(t0)
{
  for (const member of Rule15GB_members)
  {
    if (Object.is(member.t0, t0))
    {
      return member;
    }
  }
  const gb = new Rule15GB(t0);
  Rule15GB_members.add(gb);
  return gb;
}
  

  

//////////////////////////////////////////////////
// idb pred Rmax(2)
// precedes: 
// posDependsOn: I
// negDependsOn: 
// negated: false
    

const Rmax_members = new Set();
export function Rmax(t0, t1)
{
  this.t0 = t0;
  this.t1 = t1;
  this._inproducts = new Set();
  this._outproducts = new Set();
  this._outproductsgb = new Set();
}
Rmax.prototype.toString = function () {return atomString("Rmax", this.t0, this.t1)};  
Rmax.prototype.get = function () {return get_Rmax(this.t0, this.t1)};  // public API only 
Rmax.prototype._remove = function () {Rmax_members.delete(this)};

function get_Rmax(t0, t1)
{
  for (const member of Rmax_members)
  {
    if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
    {
      return member;
    }
  }
  return null;
}


function delta_add_Rmax_tuples(proposedEdbTuples)
{
  const Rmax_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_Rmax(proposed.t0, proposed.t1);
    if (actual === null)  
    {
      Rmax_tuples.push(proposed);
      Rmax_members.add(proposed);
    }
  }
  return Rmax_tuples;
}
  
/* [Rmax x {max: y}] :- [I x y] */

/* rule [aggregates] 
[Rmax x {max: y}] :- [I x y] 
*/
const Rule14 =
{
  name : 'Rule14',

  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();
    const updates = new Map(); // groupby -> additionalValues

    
      // atom [I x y] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : I_members))
      {
        const x = tuple0.t0;
        const y = tuple0.t1;
        
      // updates for [Rmax x {max: y}]
      const ptuples = new Set([tuple0]);
      const productGB = new ProductGB(Rule14, ptuples, y);
      const groupby = get_or_create_Rule14GB(x);

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [y]);
        }
        else
        {
          currentAdditionalValues.push(y);
        }
        for (const tuple of ptuples)
        {
          tuple._outproductsgb.add(productGB);
        }
        productGB._outgb = groupby;
      }

      }
      
    
    // bind head [Rmax x {max: y}]
    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple;
      const updatedValue = currentResultTuple === null ? additionalValues.reduce((acc, val) => Math.max(acc, val)) : additionalValues.reduce((acc, val) => Math.max(acc, val), currentResultTuple.t1);
      const updatedResultTuple = new Rmax(groupby.t0, updatedValue);  
      if (groupby._outtuple !== updatedResultTuple)
      {
        groupby._outtuple = updatedResultTuple;
        newTuples.add(updatedResultTuple);
        Rmax_members.add(updatedResultTuple);
      }
    }
    return newTuples;
  }
} // end Rule14


const Rule14GB_members = new Set();
function Rule14GB(t0)
{
  this.t0 = t0;
  this._outtuple = null;
}
Rule14GB.prototype.toString = function () { return atomString('Rmax', this.t0, ({toString: () => "{max: y}"})) };
Rule14GB.prototype.rule = function () { return Rule14};

function get_or_create_Rule14GB(t0)
{
  for (const member of Rule14GB_members)
  {
    if (Object.is(member.t0, t0))
    {
      return member;
    }
  }
  const gb = new Rule14GB(t0);
  Rule14GB_members.add(gb);
  return gb;
}
  

  

//////////////////////////////////////////////////
// idb pred Rsum(2)
// precedes: 
// posDependsOn: I
// negDependsOn: 
// negated: false
    

const Rsum_members = new Set();
export function Rsum(t0, t1)
{
  this.t0 = t0;
  this.t1 = t1;
  this._inproducts = new Set();
  this._outproducts = new Set();
  this._outproductsgb = new Set();
}
Rsum.prototype.toString = function () {return atomString("Rsum", this.t0, this.t1)};  
Rsum.prototype.get = function () {return get_Rsum(this.t0, this.t1)};  // public API only 
Rsum.prototype._remove = function () {Rsum_members.delete(this)};

function get_Rsum(t0, t1)
{
  for (const member of Rsum_members)
  {
    if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
    {
      return member;
    }
  }
  return null;
}


function delta_add_Rsum_tuples(proposedEdbTuples)
{
  const Rsum_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_Rsum(proposed.t0, proposed.t1);
    if (actual === null)  
    {
      Rsum_tuples.push(proposed);
      Rsum_members.add(proposed);
    }
  }
  return Rsum_tuples;
}
  
/* [Rsum x {sum: y}] :- [I x y] */

/* rule [aggregates] 
[Rsum x {sum: y}] :- [I x y] 
*/
const Rule13 =
{
  name : 'Rule13',

  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();
    const updates = new Map(); // groupby -> additionalValues

    
      // atom [I x y] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : I_members))
      {
        const x = tuple0.t0;
        const y = tuple0.t1;
        
      // updates for [Rsum x {sum: y}]
      const ptuples = new Set([tuple0]);
      const productGB = new ProductGB(Rule13, ptuples, y);
      const groupby = get_or_create_Rule13GB(x);

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [y]);
        }
        else
        {
          currentAdditionalValues.push(y);
        }
        for (const tuple of ptuples)
        {
          tuple._outproductsgb.add(productGB);
        }
        productGB._outgb = groupby;
      }

      }
      
    
    // bind head [Rsum x {sum: y}]
    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple;
      const updatedValue = currentResultTuple === null ? additionalValues.reduce((acc, val) => acc + val, 0) : additionalValues.reduce((acc, val) => undefined, currentResultTuple.t1);
      const updatedResultTuple = new Rsum(groupby.t0, updatedValue);  
      if (groupby._outtuple !== updatedResultTuple)
      {
        groupby._outtuple = updatedResultTuple;
        newTuples.add(updatedResultTuple);
        Rsum_members.add(updatedResultTuple);
      }
    }
    return newTuples;
  }
} // end Rule13


const Rule13GB_members = new Set();
function Rule13GB(t0)
{
  this.t0 = t0;
  this._outtuple = null;
}
Rule13GB.prototype.toString = function () { return atomString('Rsum', this.t0, ({toString: () => "{sum: y}"})) };
Rule13GB.prototype.rule = function () { return Rule13};

function get_or_create_Rule13GB(t0)
{
  for (const member of Rule13GB_members)
  {
    if (Object.is(member.t0, t0))
    {
      return member;
    }
  }
  const gb = new Rule13GB(t0);
  Rule13GB_members.add(gb);
  return gb;
}
  

  

export function add_tuples(edbTuples)
{
  const edbTuplesMap = new Map(edbTuples);
  
    // stratum 0
    // preds: I
    // non-recursive rules: 
    // recursive rules: 

    const I_tuples = delta_add_I_tuples(edbTuplesMap.get(I) || new Set());
  

    // stratum 1
    // preds: Rcount
    // non-recursive rules: Rule16
    // recursive rules: 

    const Rcount_tuples = new Set();

    /* Rule16 [nonRecursive]
[Rcount x {count: y}] :- [I x y]
    */
    
      // atom 0 [I x y]
      const Rule16_tuples0 = Rule16.fire(0, I_tuples);
      MutableSets.addAll(Rcount_tuples, Rule16_tuples0);
    
  
  

    // stratum 2
    // preds: Rmin
    // non-recursive rules: Rule15
    // recursive rules: 

    const Rmin_tuples = new Set();

    /* Rule15 [nonRecursive]
[Rmin x {min: y}] :- [I x y]
    */
    
      // atom 0 [I x y]
      const Rule15_tuples0 = Rule15.fire(0, I_tuples);
      MutableSets.addAll(Rmin_tuples, Rule15_tuples0);
    
  
  

    // stratum 3
    // preds: Rmax
    // non-recursive rules: Rule14
    // recursive rules: 

    const Rmax_tuples = new Set();

    /* Rule14 [nonRecursive]
[Rmax x {max: y}] :- [I x y]
    */
    
      // atom 0 [I x y]
      const Rule14_tuples0 = Rule14.fire(0, I_tuples);
      MutableSets.addAll(Rmax_tuples, Rule14_tuples0);
    
  
  

    // stratum 4
    // preds: Rsum
    // non-recursive rules: Rule13
    // recursive rules: 

    const Rsum_tuples = new Set();

    /* Rule13 [nonRecursive]
[Rsum x {sum: y}] :- [I x y]
    */
    
      // atom 0 [I x y]
      const Rule13_tuples0 = Rule13.fire(0, I_tuples);
      MutableSets.addAll(Rsum_tuples, Rule13_tuples0);
    
  
  
  return null; 
}
  

// only forward (so, in essence, only edb tuples supported) 
export function remove_tuples(tuples)
{
  const wl = [...tuples];

  function removeProduct(product)
  {
    for (const intuple of product.tuples)
    {
      intuple._outproducts.delete(product);
      // remember: it's not because a tuple's outproducts is empty,
      // that it cannot in the future play a role in other products 
    }
    const outtuple = product._outtuple;
    outtuple._inproducts.delete(product);
    if (outtuple._inproducts.size === 0)
    {
      wl.push(outtuple);
    }
    // product._outtuple = null;
  }

  while (wl.length > 0)
  {
    const tuple = wl.pop();
    tuple._remove();
    for (const product of tuple._outproducts)
    {
      removeProduct(product);     
    }
  }
}


// from membership
export function* tuples() 
{
  yield* I_members;
  yield* Rcount_members;
  yield* Rmin_members;
  yield* Rmax_members;
  yield* Rsum_members;
}

export function* edbTuples() 
{
  yield* I_members;
}

function* groupbys()
{
  yield* Rule13GB.members;
  yield* Rule14GB.members;
  yield* Rule15GB.members;
  yield* Rule16GB.members;
}  

// function rules()
// {
//   return [Rule13, Rule14, Rule15, Rule16];
// }
  

export function clear()
{
  remove_tuples(I_members);
}  
  


import {
  MutableSets,
  Product, ProductGB,
  atomString,
} from './schemelog-common.mjs';



const IMM_EMPTY_COLLECTION = Object.freeze([]);



//////////////////////////////////////////////////
// ebd pred Link(2)
// precedes: Reachable
// posDependsOn: 
// negDependsOn: 
// negated: false
    

const Link_members = new Set();
export function Link(t0, t1)
{
  this.t0 = t0;
  this.t1 = t1;
  this._inproducts = IMM_EMPTY_COLLECTION;
  this._outproducts = new Set();
  this._outproductsgb = new Set();
}
Link.prototype.toString = function () {return atomString("Link", this.t0, this.t1)};  
Link.prototype.get = function () {return get_Link(this.t0, this.t1)};  // public API only 
Link.prototype._remove = function () {Link_members.delete(this)};

function get_Link(t0, t1)
{
  for (const member of Link_members)
  {
    if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
    {
      return member;
    }
  }
  return null;
}


function delta_add_Link_tuples(proposedEdbTuples)
{
  const Link_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_Link(proposed.t0, proposed.t1);
    if (actual === null)  
    {
      Link_tuples.push(proposed);
      Link_members.add(proposed);
    }
  }
  return Link_tuples;
}
  

//////////////////////////////////////////////////
// idb pred Reachable(2)
// precedes: Reachable
// posDependsOn: Link,Reachable
// negDependsOn: 
// negated: false
    

const Reachable_members = new Set();
export function Reachable(t0, t1)
{
  this.t0 = t0;
  this.t1 = t1;
  this._inproducts = new Set();
  this._outproducts = new Set();
  this._outproductsgb = new Set();
}
Reachable.prototype.toString = function () {return atomString("Reachable", this.t0, this.t1)};  
Reachable.prototype.get = function () {return get_Reachable(this.t0, this.t1)};  // public API only 
Reachable.prototype._remove = function () {Reachable_members.delete(this)};

function get_Reachable(t0, t1)
{
  for (const member of Reachable_members)
  {
    if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
    {
      return member;
    }
  }
  return null;
}


function delta_add_Reachable_tuples(proposedEdbTuples)
{
  const Reachable_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_Reachable(proposed.t0, proposed.t1);
    if (actual === null)  
    {
      Reachable_tuples.push(proposed);
      Reachable_members.add(proposed);
    }
  }
  return Reachable_tuples;
}
  
/* [Reachable X Y] :- [Link X Y] */

/* rule [no aggregates] 
[Reachable X Y] :- [Link X Y] 
*/
// const Rule0_products = new Set();

const Rule0 =
{
  name : 'Rule0',

  fire(deltaPos, deltaTuples) // TODO: make this fire_xxx function
  {
    const newTuples = new Set();

    
      // atom [Link X Y] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : Link_members))
      {
        const X = tuple0.t0;
        const Y = tuple0.t1;
        
      // updates for [Reachable X Y]
      const ptuples = new Set([tuple0]);
      const existing_Reachable_tuple = get_Reachable(X, Y);
      if (existing_Reachable_tuple === null)
      {
        const new_Reachable_tuple = new Reachable(X, Y);
        newTuples.add(new_Reachable_tuple);
        Reachable_members.add(new_Reachable_tuple);
        const product = new Product(Rule0, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = new_Reachable_tuple;
        new_Reachable_tuple._inproducts.add(product);
      }
      else
      {
        const product = new Product(Rule0, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = existing_Reachable_tuple;
        existing_Reachable_tuple._inproducts.add(product);
      }
    
      }
      

    return newTuples;
  }
} // end Rule0

  
/* [Reachable X Y] :- [Reachable X Z],[Link Z Y] */

/* rule [no aggregates] 
[Reachable X Y] :- [Reachable X Z],[Link Z Y] 
*/
// const Rule1_products = new Set();

const Rule1 =
{
  name : 'Rule1',

  fire(deltaPos, deltaTuples) // TODO: make this fire_xxx function
  {
    const newTuples = new Set();

    
      // atom [Reachable X Z] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : Reachable_members))
      {
        const X = tuple0.t0;
        const Z = tuple0.t1;
        
      // atom [Link Z Y] [conditions]
      for (const tuple1 of (deltaPos === 1 ? deltaTuples : Link_members))
      {
        if (tuple1.t0 === Z)
        {
          const Y = tuple1.t1;
          
      // updates for [Reachable X Y]
      const ptuples = new Set([tuple0, tuple1]);
      const existing_Reachable_tuple = get_Reachable(X, Y);
      if (existing_Reachable_tuple === null)
      {
        const new_Reachable_tuple = new Reachable(X, Y);
        newTuples.add(new_Reachable_tuple);
        Reachable_members.add(new_Reachable_tuple);
        const product = new Product(Rule1, ptuples);
        tuple0._outproducts.add(product);
        tuple1._outproducts.add(product);
        product._outtuple = new_Reachable_tuple;
        new_Reachable_tuple._inproducts.add(product);
      }
      else
      {
        const product = new Product(Rule1, ptuples);
        tuple0._outproducts.add(product);
        tuple1._outproducts.add(product);
        product._outtuple = existing_Reachable_tuple;
        existing_Reachable_tuple._inproducts.add(product);
      }
    
        }
      }
      
      }
      

    return newTuples;
  }
} // end Rule1

  

export function add_tuples(edbTuples)
{
  const edbTuplesMap = new Map(edbTuples);
  
    // stratum 0
    // preds: Link
    // non-recursive rules: 
    // recursive rules: 

    const Link_tuples = delta_add_Link_tuples(edbTuplesMap.get(Link) || new Set());
  

    // stratum 1
    // preds: Reachable
    // non-recursive rules: Rule0
    // recursive rules: Rule1

    const Reachable_tuples = new Set();

    /* Rule0 [nonRecursive]
[Reachable X Y] :- [Link X Y]
    */
    
      // atom 0 [Link X Y]
      const Rule0_tuples0 = Rule0.fire(0, Link_tuples);
      MutableSets.addAll(Reachable_tuples, Rule0_tuples0);
    
  

    // recursive rules: Rule1
    // produce: Reachable

    
    let local_Reachable = Reachable_tuples;
  
    while (local_Reachable.size > 0)
    {
      
    const new_Reachable = new Set();
  
      
    /* Rule1 [recursive]
[Reachable X Y] :- [Reachable X Z],[Link Z Y]
    */
    
        // atom 0 [Reachable X Z]
        if (local_Reachable.size > 0)
        {
          const Reachable_tuples_0 = Rule1.fire(0, local_Reachable);
          MutableSets.addAll(new_Reachable, Reachable_tuples_0);
          MutableSets.addAll(Reachable_tuples, Reachable_tuples_0); // not reqd for rdb
        }    
      
  
  
      
    local_Reachable = new_Reachable;
  
    }
  
  
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
  yield* Link_members;
  yield* Reachable_members;
}

export function* edbTuples() 
{
  yield* Link_members;
}

function* groupbys()
{
  
}  

// function rules()
// {
//   return [Rule0, Rule1];
// }
  

export function clear()
{
  remove_tuples(Link_members);
}  
  


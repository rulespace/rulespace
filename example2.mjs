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
  
/* [Reachable x y] :- [Link x y] */

/* rule [no aggregates] 
[Reachable x y] :- [Link x y] 
*/
// const Rule2_products = new Set();

const Rule2 =
{
  name : 'Rule2',

  fire(deltaPos, deltaTuples) // TODO: make this fire_xxx function
  {
    const newTuples = new Set();

    
      // atom [Link x y] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : Link_members))
      {
        const x = tuple0.t0;
        const y = tuple0.t1;
        
      // updates for [Reachable x y]
      const ptuples = new Set([tuple0]);
      const existing_Reachable_tuple = get_Reachable(x, y);
      if (existing_Reachable_tuple === null)
      {
        const new_Reachable_tuple = new Reachable(x, y);
        newTuples.add(new_Reachable_tuple);
        Reachable_members.add(new_Reachable_tuple);
        const product = new Product(Rule2, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = new_Reachable_tuple;
        new_Reachable_tuple._inproducts.add(product);
      }
      else
      {
        const product = new Product(Rule2, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = existing_Reachable_tuple;
        existing_Reachable_tuple._inproducts.add(product);
      }
    
      }
      

    return newTuples;
  }
} // end Rule2

  
/* [Reachable x y] :- [Link x z],[Reachable z y] */

/* rule [no aggregates] 
[Reachable x y] :- [Link x z],[Reachable z y] 
*/
// const Rule3_products = new Set();

const Rule3 =
{
  name : 'Rule3',

  fire(deltaPos, deltaTuples) // TODO: make this fire_xxx function
  {
    const newTuples = new Set();

    
      // atom [Link x z] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : Link_members))
      {
        const x = tuple0.t0;
        const z = tuple0.t1;
        
      // atom [Reachable z y] [conditions]
      for (const tuple1 of (deltaPos === 1 ? deltaTuples : Reachable_members))
      {
        if (tuple1.t0 === z)
        {
          const y = tuple1.t1;
          
      // updates for [Reachable x y]
      const ptuples = new Set([tuple0, tuple1]);
      const existing_Reachable_tuple = get_Reachable(x, y);
      if (existing_Reachable_tuple === null)
      {
        const new_Reachable_tuple = new Reachable(x, y);
        newTuples.add(new_Reachable_tuple);
        Reachable_members.add(new_Reachable_tuple);
        const product = new Product(Rule3, ptuples);
        tuple0._outproducts.add(product);
        tuple1._outproducts.add(product);
        product._outtuple = new_Reachable_tuple;
        new_Reachable_tuple._inproducts.add(product);
      }
      else
      {
        const product = new Product(Rule3, ptuples);
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
} // end Rule3

  

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
    // non-recursive rules: Rule2
    // recursive rules: Rule3

    const Reachable_tuples = new Set();

    /* Rule2 [nonRecursive]
[Reachable x y] :- [Link x y]
    */
    
      // atom 0 [Link x y]
      const Rule2_tuples0 = Rule2.fire(0, Link_tuples);
      MutableSets.addAll(Reachable_tuples, Rule2_tuples0);
    
  

    // recursive rules: Rule3
    // produce: Reachable

    
    let local_Reachable = Reachable_tuples;
  
    while (local_Reachable.size > 0)
    {
      
    const new_Reachable = new Set();
  
      
    /* Rule3 [recursive]
[Reachable x y] :- [Link x z],[Reachable z y]
    */
    
        // atom 1 [Reachable z y]
        if (local_Reachable.size > 0)
        {
          const Reachable_tuples_1 = Rule3.fire(1, local_Reachable);
          MutableSets.addAll(new_Reachable, Reachable_tuples_1);
          MutableSets.addAll(Reachable_tuples, Reachable_tuples_1); // not reqd for rdb
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
//   return [Rule2, Rule3];
// }
  

export function clear()
{
  remove_tuples(Link_members);
}  
  


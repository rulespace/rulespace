import {
  MutableSets,
  Product, ProductGB,
  atomString,
} from './schemelog-common.mjs';



const IMM_EMPTY_COLLECTION = Object.freeze([]);



//////////////////////////////////////////////////
// ebd pred Link(2)
// precedes: Reachable,Node
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
// idb pred Node(1)
// precedes: 
// posDependsOn: Link
// negDependsOn: 
// negated: false
    

const Node_members = new Set();
export function Node(t0)
{
  this.t0 = t0;
  this._inproducts = new Set();
  this._outproducts = new Set();
  this._outproductsgb = new Set();
}
Node.prototype.toString = function () {return atomString("Node", this.t0)};  
Node.prototype.get = function () {return get_Node(this.t0)};  // public API only 
Node.prototype._remove = function () {Node_members.delete(this)};

function get_Node(t0)
{
  for (const member of Node_members)
  {
    if (Object.is(member.t0, t0))
    {
      return member;
    }
  }
  return null;
}


function delta_add_Node_tuples(proposedEdbTuples)
{
  const Node_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_Node(proposed.t0);
    if (actual === null)  
    {
      Node_tuples.push(proposed);
      Node_members.add(proposed);
    }
  }
  return Node_tuples;
}
  
/* [Node X] :- [Link X _] */

/* rule [no aggregates] 
[Node X] :- [Link X _] 
*/
// const Rule6_products = new Set();

const Rule6 =
{
  name : 'Rule6',

  fire(deltaPos, deltaTuples) // TODO: make this fire_xxx function
  {
    const newTuples = new Set();

    
      // atom [Link X _] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : Link_members))
      {
        const X = tuple0.t0;
        const _ = tuple0.t1;
        
      // updates for [Node X]
      const ptuples = new Set([tuple0]);
      const existing_Node_tuple = get_Node(X);
      if (existing_Node_tuple === null)
      {
        const new_Node_tuple = new Node(X);
        newTuples.add(new_Node_tuple);
        Node_members.add(new_Node_tuple);
        const product = new Product(Rule6, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = new_Node_tuple;
        new_Node_tuple._inproducts.add(product);
      }
      else
      {
        const product = new Product(Rule6, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = existing_Node_tuple;
        existing_Node_tuple._inproducts.add(product);
      }
    
      }
      

    return newTuples;
  }
} // end Rule6

  
/* [Node Y] :- [Link _ Y] */

/* rule [no aggregates] 
[Node Y] :- [Link _ Y] 
*/
// const Rule7_products = new Set();

const Rule7 =
{
  name : 'Rule7',

  fire(deltaPos, deltaTuples) // TODO: make this fire_xxx function
  {
    const newTuples = new Set();

    
      // atom [Link _ Y] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : Link_members))
      {
        const _ = tuple0.t0;
        const Y = tuple0.t1;
        
      // updates for [Node Y]
      const ptuples = new Set([tuple0]);
      const existing_Node_tuple = get_Node(Y);
      if (existing_Node_tuple === null)
      {
        const new_Node_tuple = new Node(Y);
        newTuples.add(new_Node_tuple);
        Node_members.add(new_Node_tuple);
        const product = new Product(Rule7, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = new_Node_tuple;
        new_Node_tuple._inproducts.add(product);
      }
      else
      {
        const product = new Product(Rule7, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = existing_Node_tuple;
        existing_Node_tuple._inproducts.add(product);
      }
    
      }
      

    return newTuples;
  }
} // end Rule7

  

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
// const Rule4_products = new Set();

const Rule4 =
{
  name : 'Rule4',

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
        const product = new Product(Rule4, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = new_Reachable_tuple;
        new_Reachable_tuple._inproducts.add(product);
      }
      else
      {
        const product = new Product(Rule4, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = existing_Reachable_tuple;
        existing_Reachable_tuple._inproducts.add(product);
      }
    
      }
      

    return newTuples;
  }
} // end Rule4

  
/* [Reachable X Y] :- [Link X Z],[Reachable Z Y] */

/* rule [no aggregates] 
[Reachable X Y] :- [Link X Z],[Reachable Z Y] 
*/
// const Rule5_products = new Set();

const Rule5 =
{
  name : 'Rule5',

  fire(deltaPos, deltaTuples) // TODO: make this fire_xxx function
  {
    const newTuples = new Set();

    
      // atom [Link X Z] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : Link_members))
      {
        const X = tuple0.t0;
        const Z = tuple0.t1;
        
      // atom [Reachable Z Y] [conditions]
      for (const tuple1 of (deltaPos === 1 ? deltaTuples : Reachable_members))
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
        const product = new Product(Rule5, ptuples);
        tuple0._outproducts.add(product);
        tuple1._outproducts.add(product);
        product._outtuple = new_Reachable_tuple;
        new_Reachable_tuple._inproducts.add(product);
      }
      else
      {
        const product = new Product(Rule5, ptuples);
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
} // end Rule5

  

export function add_tuples(edbTuples)
{
  const edbTuplesMap = new Map(edbTuples);
  
    // stratum 0
    // preds: Link
    // non-recursive rules: 
    // recursive rules: 

    const Link_tuples = delta_add_Link_tuples(edbTuplesMap.get(Link) || new Set());
  

    // stratum 1
    // preds: Node
    // non-recursive rules: Rule6,Rule7
    // recursive rules: 

    const Node_tuples = new Set();

    /* Rule6 [nonRecursive]
[Node X] :- [Link X _]
    */
    
      // atom 0 [Link X _]
      const Rule6_tuples0 = Rule6.fire(0, Link_tuples);
      MutableSets.addAll(Node_tuples, Rule6_tuples0);
    
  
    
    /* Rule7 [nonRecursive]
[Node Y] :- [Link _ Y]
    */
    
      // atom 0 [Link _ Y]
      const Rule7_tuples0 = Rule7.fire(0, Link_tuples);
      MutableSets.addAll(Node_tuples, Rule7_tuples0);
    
  
  

    // stratum 2
    // preds: Reachable
    // non-recursive rules: Rule4
    // recursive rules: Rule5

    const Reachable_tuples = new Set();

    /* Rule4 [nonRecursive]
[Reachable X Y] :- [Link X Y]
    */
    
      // atom 0 [Link X Y]
      const Rule4_tuples0 = Rule4.fire(0, Link_tuples);
      MutableSets.addAll(Reachable_tuples, Rule4_tuples0);
    
  

    // recursive rules: Rule5
    // produce: Reachable

    
    let local_Reachable = Reachable_tuples;
  
    while (local_Reachable.size > 0)
    {
      
    const new_Reachable = new Set();
  
      
    /* Rule5 [recursive]
[Reachable X Y] :- [Link X Z],[Reachable Z Y]
    */
    
        // atom 1 [Reachable Z Y]
        if (local_Reachable.size > 0)
        {
          const Reachable_tuples_1 = Rule5.fire(1, local_Reachable);
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
  yield* Node_members;
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
//   return [Rule4, Rule5, Rule6, Rule7];
// }
  

export function clear()
{
  remove_tuples(Link_members);
}  
  


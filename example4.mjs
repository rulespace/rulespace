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
// precedes: Unreachable
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
// const Rule10_products = new Set();

const Rule10 =
{
  name : 'Rule10',

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
        const product = new Product(Rule10, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = new_Node_tuple;
        new_Node_tuple._inproducts.add(product);
      }
      else
      {
        const product = new Product(Rule10, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = existing_Node_tuple;
        existing_Node_tuple._inproducts.add(product);
      }
    
      }
      

    return newTuples;
  }
} // end Rule10

  
/* [Node Y] :- [Link _ Y] */

/* rule [no aggregates] 
[Node Y] :- [Link _ Y] 
*/
// const Rule11_products = new Set();

const Rule11 =
{
  name : 'Rule11',

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
        const product = new Product(Rule11, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = new_Node_tuple;
        new_Node_tuple._inproducts.add(product);
      }
      else
      {
        const product = new Product(Rule11, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = existing_Node_tuple;
        existing_Node_tuple._inproducts.add(product);
      }
    
      }
      

    return newTuples;
  }
} // end Rule11

  

//////////////////////////////////////////////////
// idb pred Reachable(2)
// precedes: Reachable,Unreachable
// posDependsOn: Link,Reachable
// negDependsOn: 
// negated: true
    

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

const NOT_Reachable_members = new Set();
export function NOT_Reachable(t0, t1)
{
  this.t0 = t0;
  this.t1 = t1;  
  this._outproducts = new Set();
}        
NOT_Reachable.prototype.toString = function () {return atomString("!Reachable", this.t0, this.t1)};  
NOT_Reachable.prototype._remove = function () {NOT_Reachable_members.delete(this)};

function get_or_create_NOT_Reachable(t0, t1)
{
  for (const member of NOT_Reachable_members)
  {
    if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
    {
      return member;
    }
  }
  return new NOT_Reachable(t0, t1);
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
// const Rule8_products = new Set();

const Rule8 =
{
  name : 'Rule8',

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
        const product = new Product(Rule8, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = new_Reachable_tuple;
        new_Reachable_tuple._inproducts.add(product);
      }
      else
      {
        const product = new Product(Rule8, ptuples);
        tuple0._outproducts.add(product);
        product._outtuple = existing_Reachable_tuple;
        existing_Reachable_tuple._inproducts.add(product);
      }
    
      }
      

    return newTuples;
  }
} // end Rule8

  
/* [Reachable X Y] :- [Link X Z],[Reachable Z Y] */

/* rule [no aggregates] 
[Reachable X Y] :- [Link X Z],[Reachable Z Y] 
*/
// const Rule9_products = new Set();

const Rule9 =
{
  name : 'Rule9',

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
        const product = new Product(Rule9, ptuples);
        tuple0._outproducts.add(product);
        tuple1._outproducts.add(product);
        product._outtuple = new_Reachable_tuple;
        new_Reachable_tuple._inproducts.add(product);
      }
      else
      {
        const product = new Product(Rule9, ptuples);
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
} // end Rule9

  

//////////////////////////////////////////////////
// idb pred Unreachable(2)
// precedes: 
// posDependsOn: Node
// negDependsOn: Reachable
// negated: false
    

const Unreachable_members = new Set();
export function Unreachable(t0, t1)
{
  this.t0 = t0;
  this.t1 = t1;
  this._inproducts = new Set();
  this._outproducts = new Set();
  this._outproductsgb = new Set();
}
Unreachable.prototype.toString = function () {return atomString("Unreachable", this.t0, this.t1)};  
Unreachable.prototype.get = function () {return get_Unreachable(this.t0, this.t1)};  // public API only 
Unreachable.prototype._remove = function () {Unreachable_members.delete(this)};

function get_Unreachable(t0, t1)
{
  for (const member of Unreachable_members)
  {
    if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
    {
      return member;
    }
  }
  return null;
}


function delta_add_Unreachable_tuples(proposedEdbTuples)
{
  const Unreachable_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_Unreachable(proposed.t0, proposed.t1);
    if (actual === null)  
    {
      Unreachable_tuples.push(proposed);
      Unreachable_members.add(proposed);
    }
  }
  return Unreachable_tuples;
}
  
/* [Unreachable X Y] :- [Node X],[Node Y],¬[Reachable X Y] */

/* rule [no aggregates] 
[Unreachable X Y] :- [Node X],[Node Y],¬[Reachable X Y] 
*/
// const Rule12_products = new Set();

const Rule12 =
{
  name : 'Rule12',

  fire(deltaPos, deltaTuples) // TODO: make this fire_xxx function
  {
    const newTuples = new Set();

    
      // atom [Node X] [no conditions]
      for (const tuple0 of (deltaPos === 0 ? deltaTuples : Node_members))
      {
        const X = tuple0.t0;
        
      // atom [Node Y] [no conditions]
      for (const tuple1 of (deltaPos === 1 ? deltaTuples : Node_members))
      {
        const Y = tuple1.t0;
        
      // atom ¬[Reachable X Y] [conditions]
      let found2 = false;
      for (const tuple2 of Reachable_members)
      {
        if (tuple2.t0 === X && tuple2.t1 === Y)
        {
          found2 = true; // TODO solve with continue;
          break;
        }
      }
      if (found2)
      {
        continue;
      }
      const NOT_tuple2 = get_or_create_NOT_Reachable(X, Y);
      
      // updates for [Unreachable X Y]
      const ptuples = new Set([tuple0, tuple1, NOT_tuple2]);
      const existing_Unreachable_tuple = get_Unreachable(X, Y);
      if (existing_Unreachable_tuple === null)
      {
        const new_Unreachable_tuple = new Unreachable(X, Y);
        newTuples.add(new_Unreachable_tuple);
        Unreachable_members.add(new_Unreachable_tuple);
        const product = new Product(Rule12, ptuples);
        tuple0._outproducts.add(product);
        tuple1._outproducts.add(product);
        NOT_tuple2._outproducts.add(product);
        product._outtuple = new_Unreachable_tuple;
        new_Unreachable_tuple._inproducts.add(product);
      }
      else
      {
        const product = new Product(Rule12, ptuples);
        tuple0._outproducts.add(product);
        tuple1._outproducts.add(product);
        NOT_tuple2._outproducts.add(product);
        product._outtuple = existing_Unreachable_tuple;
        existing_Unreachable_tuple._inproducts.add(product);
      }
    
      
      }
      
      }
      

    return newTuples;
  }
} // end Rule12

  

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
    // non-recursive rules: Rule10,Rule11
    // recursive rules: 

    const Node_tuples = new Set();

    /* Rule10 [nonRecursive]
[Node X] :- [Link X _]
    */
    
      // atom 0 [Link X _]
      const Rule10_tuples0 = Rule10.fire(0, Link_tuples);
      MutableSets.addAll(Node_tuples, Rule10_tuples0);
    
  
    
    /* Rule11 [nonRecursive]
[Node Y] :- [Link _ Y]
    */
    
      // atom 0 [Link _ Y]
      const Rule11_tuples0 = Rule11.fire(0, Link_tuples);
      MutableSets.addAll(Node_tuples, Rule11_tuples0);
    
  
  

    // stratum 2
    // preds: Reachable
    // non-recursive rules: Rule8
    // recursive rules: Rule9

    const Reachable_tuples = new Set();

    /* Rule8 [nonRecursive]
[Reachable X Y] :- [Link X Y]
    */
    
      // atom 0 [Link X Y]
      const Rule8_tuples0 = Rule8.fire(0, Link_tuples);
      MutableSets.addAll(Reachable_tuples, Rule8_tuples0);
    
  

    // recursive rules: Rule9
    // produce: Reachable

    
    let local_Reachable = Reachable_tuples;
  
    while (local_Reachable.size > 0)
    {
      
    const new_Reachable = new Set();
  
      
    /* Rule9 [recursive]
[Reachable X Y] :- [Link X Z],[Reachable Z Y]
    */
    
        // atom 1 [Reachable Z Y]
        if (local_Reachable.size > 0)
        {
          const Reachable_tuples_1 = Rule9.fire(1, local_Reachable);
          MutableSets.addAll(new_Reachable, Reachable_tuples_1);
          MutableSets.addAll(Reachable_tuples, Reachable_tuples_1); // not reqd for rdb
        }    
      
  
  
      
    local_Reachable = new_Reachable;
  
    }
  
  

    // stratum 3
    // preds: Unreachable
    // non-recursive rules: Rule12
    // recursive rules: 

    const Unreachable_tuples = new Set();

    /* Rule12 [nonRecursive]
[Unreachable X Y] :- [Node X],[Node Y],¬[Reachable X Y]
    */
    
      // atom 0 [Node X]
      const Rule12_tuples0 = Rule12.fire(0, Node_tuples);
      MutableSets.addAll(Unreachable_tuples, Rule12_tuples0);
    
    
      // atom 1 [Node Y]
      const Rule12_tuples1 = Rule12.fire(1, Node_tuples);
      MutableSets.addAll(Unreachable_tuples, Rule12_tuples1);
    
  
  
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
  yield* Unreachable_members;
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
//   return [Rule8, Rule9, Rule10, Rule11, Rule12];
// }
  

export function clear()
{
  remove_tuples(Link_members);
}  
  


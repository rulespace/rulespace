import {
  MutableSets,
  Product, ProductGB, products, productsGB, 
  atomString,
} from './schemelog-common.mjs';


//////////////////////////////////////////////////
// ebd pred D (arity: 1)
// precedes: E
// posDependsOn: 
// negDependsOn: 
// rules:
    

const D_members = new Set();
export function D(t0)
{
  this._inproducts = null;
  this._outproducts = null;
  this._outproductsgb = null;
}
D.prototype.toString = function () {return atomString("D", this.t0)};  
  

export function get_D_tuple(t0)
{
  for (const member of D_members)
  {
    if (Object.is(member.t0, t0))
    {
      return member;
    }
  }
  return null;
}
  

function delta_add_D_tuples(proposedEdbTuples)
{
  const D_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_D_tuple(proposed.t0);
    if (actual !== null)  
    {
      D_tuples.push(proposed);
      D_members.add(proposed);
    }
  }
  return D_tuples;
}
  

//////////////////////////////////////////////////
// idb pred E (arity: 1)
// precedes: C
// posDependsOn: D
// negDependsOn: 
// rules:
    
/* [E x] :- [D x] */

const E_members = new Set();
export function E(t0)
{
  this._inproducts = null;
  this._outproducts = null;
  this._outproductsgb = null;
}
E.prototype.toString = function () {return atomString("E", this.t0)};  
  

export function get_E_tuple(t0)
{
  for (const member of E_members)
  {
    if (Object.is(member.t0, t0))
    {
      return member;
    }
  }
  return null;
}
  

function delta_add_E_tuples(proposedEdbTuples)
{
  const E_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_E_tuple(proposed.t0);
    if (actual !== null)  
    {
      E_tuples.push(proposed);
      E_members.add(proposed);
    }
  }
  return E_tuples;
}
  

//////////////////////////////////////////////////
// ebd pred A (arity: 1)
// precedes: B
// posDependsOn: 
// negDependsOn: 
// rules:
    

const A_members = new Set();
export function A(t0)
{
  this._inproducts = null;
  this._outproducts = null;
  this._outproductsgb = null;
}
A.prototype.toString = function () {return atomString("A", this.t0)};  
  

export function get_A_tuple(t0)
{
  for (const member of A_members)
  {
    if (Object.is(member.t0, t0))
    {
      return member;
    }
  }
  return null;
}
  

function delta_add_A_tuples(proposedEdbTuples)
{
  const A_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_A_tuple(proposed.t0);
    if (actual !== null)  
    {
      A_tuples.push(proposed);
      A_members.add(proposed);
    }
  }
  return A_tuples;
}
  

//////////////////////////////////////////////////
// idb pred B (arity: 1)
// precedes: C
// posDependsOn: A
// negDependsOn: 
// rules:
    
/* [B x] :- [A x] */

const B_members = new Set();
export function B(t0)
{
  this._inproducts = null;
  this._outproducts = null;
  this._outproductsgb = null;
}
B.prototype.toString = function () {return atomString("B", this.t0)};  
  

export function get_B_tuple(t0)
{
  for (const member of B_members)
  {
    if (Object.is(member.t0, t0))
    {
      return member;
    }
  }
  return null;
}
  

function delta_add_B_tuples(proposedEdbTuples)
{
  const B_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_B_tuple(proposed.t0);
    if (actual !== null)  
    {
      B_tuples.push(proposed);
      B_members.add(proposed);
    }
  }
  return B_tuples;
}
  

//////////////////////////////////////////////////
// idb pred C (arity: 1)
// precedes: 
// posDependsOn: B,E
// negDependsOn: 
// rules:
    
/* [C x] :- [B x] */
/* [C x] :- [E x] */

const C_members = new Set();
export function C(t0)
{
  this._inproducts = null;
  this._outproducts = null;
  this._outproductsgb = null;
}
C.prototype.toString = function () {return atomString("C", this.t0)};  
  

export function get_C_tuple(t0)
{
  for (const member of C_members)
  {
    if (Object.is(member.t0, t0))
    {
      return member;
    }
  }
  return null;
}
  

function delta_add_C_tuples(proposedEdbTuples)
{
  const C_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = get_C_tuple(proposed.t0);
    if (actual !== null)  
    {
      C_tuples.push(proposed);
      C_members.add(proposed);
    }
  }
  return C_tuples;
}
  

//////////////////////////////////////////////////
// stratum 0
// preds: D
    

//////////////////////////////////////////////////
// stratum 1
// preds: E
    

//////////////////////////////////////////////////
// stratum 2
// preds: A
    

//////////////////////////////////////////////////
// stratum 3
// preds: B
    

//////////////////////////////////////////////////
// stratum 4
// preds: C
    

export function add_tuples(edbTuplesMap)
{
  
    // stratum 0
    // preds: D
    // non-recursive rules: 
    // recursive rules: 

    const D_tuples = new Set();

  

    // stratum 1
    // preds: E
    // non-recursive rules: Rule2
    // recursive rules: 

    const E_tuples = new Set();

    /* Rule2 [nonRecursive]
[E x] :- [D x]
    */
    
      // atom 0 [D x]
      const Rule2_tuples0 = Rule2.fire(0, D_tuples);
      MutableSets.addAll(E_tuples, Rule2_tuples0);
    
  
  

    // stratum 2
    // preds: A
    // non-recursive rules: 
    // recursive rules: 

    const A_tuples = new Set();

  

    // stratum 3
    // preds: B
    // non-recursive rules: Rule0
    // recursive rules: 

    const B_tuples = new Set();

    /* Rule0 [nonRecursive]
[B x] :- [A x]
    */
    
      // atom 0 [A x]
      const Rule0_tuples0 = Rule0.fire(0, A_tuples);
      MutableSets.addAll(B_tuples, Rule0_tuples0);
    
  
  

    // stratum 4
    // preds: C
    // non-recursive rules: Rule1,Rule3
    // recursive rules: 

    const C_tuples = new Set();

    /* Rule1 [nonRecursive]
[C x] :- [B x]
    */
    
      // atom 0 [B x]
      const Rule1_tuples0 = Rule1.fire(0, B_tuples);
      MutableSets.addAll(C_tuples, Rule1_tuples0);
    
  
    
    /* Rule3 [nonRecursive]
[C x] :- [E x]
    */
    
      // atom 0 [E x]
      const Rule3_tuples0 = Rule3.fire(0, E_tuples);
      MutableSets.addAll(C_tuples, Rule3_tuples0);
    
  
  
  return null; 
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

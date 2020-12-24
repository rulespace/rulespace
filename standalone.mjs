import {
  MutableSets,
  Product, ProductGB,
  atomString,
} from './schemelog-common.mjs';



const IMM_EMPTY_COLLECTION = Object.freeze([]);



//////////////////////////////////////////////////
// ebd pred I(2)
// precedes: Rsum
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
const Rule0 =
{
  name : 'Rule0',

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
      const productGB = new ProductGB(Rule0, ptuples, y);
      const groupby = get_or_create_Rule0GB(x);

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
} // end Rule0


const Rule0GB_members = new Set();
function Rule0GB(t0)
{
  this.t0 = t0;
  this._outtuple = null;
}
Rule0GB.prototype.toString = function () { return atomString('Rsum', this.t0, ({toString: () => "{sum: y}"})) };
Rule0GB.prototype.rule = function () { return Rule0};

function get_or_create_Rule0GB(t0)
{
  for (const member of Rule0GB_members)
  {
    if (Object.is(member.t0, t0))
    {
      return member;
    }
  }
  const gb = new Rule0GB(t0);
  Rule0GB_members.add(gb);
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
    // preds: Rsum
    // non-recursive rules: Rule0
    // recursive rules: 

    const Rsum_tuples = new Set();

    /* Rule0 [nonRecursive]
[Rsum x {sum: y}] :- [I x y]
    */
    
      // atom 0 [I x y]
      const Rule0_tuples0 = Rule0.fire(0, I_tuples);
      MutableSets.addAll(Rsum_tuples, Rule0_tuples0);
    
  
  
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
  yield* Rsum_members;
}

export function* edbTuples() 
{
  yield* I_members;
}

function* groupbys()
{
  yield* Rule0GB.members;
}  

// function rules()
// {
//   return [Rule0];
// }
  

export function clear()
{
  remove_tuples(I_members);
}  
  


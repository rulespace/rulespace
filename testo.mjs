import {
  assertTrue, Maps, Arrays, MutableSets,
  Product, ProductGB, products, productsGB, TuplePartition,
  atomString
} from './scriptlog-common.mjs';

let generation = 0;

export function X(t0)
{
  for (const member of X_.members)
  {
    if (Object.is(member.t0, t0))
    {
      return member;
    }
  }
  return new X_(t0);
}
function X_(t0)
{
  this.t0 = t0;
  this._id = X_.members.length;
  this._outproducts = new Set();
  X_.members.push(this);
}
X_.members = [];
X_.prototype.toString = function () {return atomString("X", this.t0)};

export function R(t0, t1)
{
  for (const member of R_.members)
  {
    if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
    {
      return member;
    }
  }
  return new R_(t0, t1);
}
function R_(t0, t1)
{
  this.t0 = t0;
  this.t1 = t1;
  this._id = R_.members.length;
  this._outproducts = new Set();
  R_.members.push(this);
}
R_.members = [];
R_.prototype.toString = function () {return atomString("R", this.t0, this.t1)};

export function I(t0, t1)
{
  for (const member of I_.members)
  {
    if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
    {
      return member;
    }
  }
  return new I_(t0, t1);
}
function I_(t0, t1)
{
  this.t0 = t0;
  this.t1 = t1;
  this._id = I_.members.length;
  this._outproducts = new Set();
  I_.members.push(this);
}
I_.members = [];
I_.prototype.toString = function () {return atomString("I", this.t0, this.t1)};
  
// (R x sum<z>) :- (X x) (I x y), z = y*y 
const Rule0 =
{
  name : 'rule0',
  
  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();
    const updates = new Map(); // groupby -> additionalValues

    for (const tuple0 of (deltaPos === 0 ? deltaTuples : X_.members))
    {
      const x = tuple0.t0;
      for (const tuple1 of (deltaPos === 1 ? deltaTuples : I_.members))
      {
        if (tuple1.t0 === x)
        {
          const y = tuple1.t1;

          //assign
          const z = y * y;

          // updates for head (R x sum<z>)
          const ptuples = new Set([tuple0, tuple1]);
          const productGB = new ProductGB(ptuples, z);
          const groupby = new Rule0GB(x);

          if (productGB._outgb === groupby) // 'not new': TODO turn this around
          {
            // already contributes, do nothing
          }
          else
          {
            const currentAdditionalValues = updates.get(groupby);
            if (!currentAdditionalValues)
            {
              updates.set(groupby, [z]);
            }
            else
            {
              currentAdditionalValues.push(z);
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
    
    // bind head (R x sum<z>)
    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple;
      const currentValue = currentResultTuple === null ? 0 : currentResultTuple.t1;
      const updatedValue = additionalValues.reduce((acc, val) => acc + val, currentValue);
      const updatedResultTuple = R(groupby.t0, updatedValue);
      if (groupby._outtuple !== updatedResultTuple)
      {
        groupby._outtuple = updatedResultTuple;
        newTuples.add(updatedResultTuple);
      }
    }
    return newTuples;
  }

}

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
    return atomString('r', this.t0, ({toString: () => "sum<z>"}));
  }
}


//////
export function Link(t0, t1)
{
  for (const member of Link_.members)
  {
    if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
    {
      return member;
    }
  }
  return new Link_(t0, t1);
}
function Link_(t0, t1)
{
  this.t0 = t0;
  this.t1 = t1;
  this._id = Link_.members.length;
  this._outproducts = new Set();
  Link_.members.push(this);
}
Link_.members = [];
Link_.prototype.toString = function () {return atomString("Link", this.t0, this.t1)};

export function Reachable(t0, t1)
{
  for (const member of Reachable_.members)
  {
    if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
    {
      return member;
    }
  }
  return new Reachable_(t0, t1);
}
function Reachable_(t0, t1)
{
  console.log("new R(" + t0 + ", " + t1 + ")");
  this.t0 = t0;
  this.t1 = t1;
  this._id = Reachable_.members.length;
  this._outproducts = new Set();
  Reachable_.members.push(this);
}
Reachable_.members = [];
Reachable_.prototype.toString = function () {return atomString("Reachable", this.t0, this.t1)};

export function Reachable2(t0, t1)
{
  for (const member of Reachable2_.members)
  {
    if (Object.is(member.t0, t0) && Object.is(member.t1, t1))
    {
      return member;
    }
  }
  return new Reachable2_(t0, t1);
}
function Reachable2_(t0, t1)
{
  console.log("new R2(" + t0 + ", " + t1 + ")");
  this.t0 = t0;
  this.t1 = t1;
  this._id = Reachable2_.members.length;
  this._outproducts = new Set();
  Reachable2_.members.push(this);
}
Reachable2_.members = [];
Reachable2_.prototype.toString = function () {return atomString("Reachable2", this.t0, this.t1)};


export function Node(t0)
{
  for (const member of Node_.members)
  {
    if (Object.is(member.t0, t0))
    {
      return member;
    }
  }
  return new Node_(t0);
}
function Node_(t0)
{
  this.t0 = t0;
  this._id = Node_.members.length;
  this._outproducts = new Set();
  Node_.members.push(this);
}
Node_.members = [];
Node_.prototype.toString = function () {return atomString("Node", this.t0)};

// (Reachable x y) :- (Link x y)
const Rule1 =
{
  name : 'rule1',
  
  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();

    for (const tuple0 of (deltaPos === 0 ? deltaTuples : Link_.members))
    {
      const x = tuple0.t0;
      const y = tuple0.t1;

      // updates for head (Reachable x y)
      const ptuples = new Set([tuple0]);
      const product = new Product(ptuples);
      const resultTuple = Reachable(x, y);
      if (product._outtuple !== resultTuple)
      {
        product._outtuple = resultTuple;
        tuple0._outproducts.add(product);
        newTuples.add(resultTuple);
      }
    }
    return newTuples;
  }
}

// (Reachable2 x y) :- (Reachable x z) (Link z y)
const Rule2 =
{
  name : 'rule2',
  
  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();

    for (const tuple0 of (deltaPos === 0 ? deltaTuples : Reachable_.members))
    {
      const x = tuple0.t0;
      const z = tuple0.t1;

      for (const tuple1 of (deltaPos === 1 ? deltaTuples : Link_.members))
      {
        if (tuple1.t0 === tuple0.t1)
        {
          const y = tuple1.t1;

          // updates for head (Reachable x y)
          const ptuples = new Set([tuple0, tuple1]);
          const product = new Product(ptuples);
          const resultTuple = Reachable2(x, y);
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
}

// (Reachable x y) :- (Reachable2 x y)
const Rule3 =
{
  name : 'rule3',
  
  fire(deltaPos, deltaTuples)
  {
    const newTuples = new Set();

    for (const tuple0 of (deltaPos === 0 ? deltaTuples : Reachable2_.members))
    {
      const x = tuple0.t0;
      const y = tuple0.t1;

      // updates for head (Reachable x y)
      const ptuples = new Set([tuple0]);
      const product = new Product(ptuples);
      const resultTuple = Reachable(x, y);
      if (product._outtuple !== resultTuple)
      {
        product._outtuple = resultTuple;
        tuple0._outproducts.add(product);
        newTuples.add(resultTuple);
      }
    }

    return newTuples;
  }
}


//////

function* tuples()
{
  yield* X_.members;
  yield* I_.members;
  yield* R_.members;

  yield* Link_.members;
  yield* Reachable_.members;
  yield* Reachable2_.members;
  yield* Node_.members;
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
    edbTuple.generation = generation;
    partition.add(edbTuple);
  }

  // stratum 0: link; no rules
  const Linktuples = partition.get(Link_) || new Set();

  // stratum 1: i; no rules
  const Ituples = partition.get(I_) || new Set();

  // stratum 2: x; no rules
  const Xtuples = partition.get(X_) || new Set();

  //stratum 3: r;
  const Rtuples = new Set();
  // non-recursive rule: Rule0
    // Rule0 (R x sum<z>) :- (X x) (I x y), z = y*y 
      // term 0
      const Rtuples0 = Rule0.fire(0, Xtuples);
      MutableSets.addAll(Rtuples, Rtuples0);
      // term 1
      const Rtuples1 = Rule0.fire(1, Ituples);
      MutableSets.addAll(Rtuples, Rtuples1);
  
  // stratum 4: reachable;
  const Reachabletuples = new Set();
  const Reachable2tuples = new Set();  
  
  // non-recursive rules: Rule1
  // Rule 1
  const Reachabletuples0 = Rule1.fire(0, Linktuples);
  MutableSets.addAll(Reachabletuples, Reachabletuples0);

  // recursive rules: Rule2, Rule3
  let localReachable = Reachabletuples; // readonly localReach: don't mutate through ref
  let localReachable2 = Reachable2tuples;
  while (localReachable.size > 0 || localReachable2.size > 0)
  {
    const newReachable2 = new Set();
    const newReachable = new Set();
    
    // Rule2
    if (localReachable.size > 0)
    {
      const rule2tuples = Rule2.fire(0, localReachable);
      MutableSets.addAll(Reachable2tuples, rule2tuples);  
      MutableSets.addAll(newReachable2, rule2tuples);
    }

    // Rule3
    if (localReachable2.size > 0)
    {
      const rule3tuples = Rule3.fire(0, localReachable2);
      MutableSets.addAll(Reachabletuples, rule3tuples);  
      MutableSets.addAll(newReachable, rule3tuples);
    }

    localReachable = newReachable;
    localReachable2 = newReachable2;
  }

  return; 
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

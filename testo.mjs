function assertTrue(x)
{
  if (x !== true)
  {
    throw new Error("expected true, got: " + x);
  }
}

function assertFalse(x)
{
  if (x !== false)
  {
    throw new Error("expected false, got: " + x);
  }
}

const Arrays =
{
  push(array, x)
  {
    const array2 = array.slice(0);
    array2.push(x);
    return array2;
  }
}

const Sets = 
{
  equals(x, y)
  {
    if (x === y)
    {
      return true;
    }
    if (x.size !== y.size)
    {
      return false;
    }
    for (const xvalue of x)
    {
      if (!y.has(xvalue))
      {
        return false;
      }
    }
    return true;
  }
}

const Maps =
{
  put(map, key, value)
  {
    const map2 = new Map(map);
    map2.set(key, value);
    return map2;
  }
}

function atomString(predicateName, ...termValues)
{
  return `${predicateName}(${termValues.map(termString).join(",")})`;
}

function termString(termValue)
{
  if (typeof termValue === "string")
  {
    return "'" + termValue + "'";
  }

  return String(termValue);
}

class X
{

  static members = [];
  _outproducts = new Set();

  constructor(x)
  {
    for (const member of X.members)
    {
      if (Object.is(member.x, x))
      {
        return member;
      }
    }
    this.x = x;
    this._id = X.members.length;
    X.members.push(this);
  }

  toString()
  {
    return atomString("x", this.x);
  }
}

class I
{

  static members = [];
  _outproducts = new Set();

  constructor(x, y)
  {
    for (const member of I.members)
    {
      if (Object.is(member.x, x) && Object.is(member.y, y))
      {
        return member;
      }
    }
    this.x = x;
    this.y = y;
    this._id = I.members.length;
    I.members.push(this);
  }

  toString()
  {
    return atomString("i", this.x, this.y);
  }
}

class R
{

  static members = [];
  _outproducts = new Set();

  constructor(x, z)
  {
    for (const member of R.members)
    {
      if (Object.is(member.x, x) && Object.is(member.z, z))
      {
        return member;
      }
    }
    this.x = x;
    this.z = z;
    this._id = R.members.length;
    R.members.push(this);
  }

  toString()
  {
    return atomString("r", this.x, this.z);
  }
}

const predicates = [X, I, R];

// (R x sum<z>) :- (X x) (I x y), z = y*y 
const Rule1 =
{
  name : 'r1',
  
  GroupBy : class
  {
    static members = [];
    _outtuple = null;

    constructor(x)
    {
      for (const member of Rule1.GroupBy.members)
      {
        if (Object.is(member.x, x))
        {
          return member;
        }
      }
      this.x = x;
      this._id = Rule1.GroupBy.members.length;
      Rule1.GroupBy.members.push(this);
    }

    rule()
    {
      return Rule1;
    }

    toString()
    {
      return atomString('r', this.x, ({toString: () => "sum<z>"}));
    }
  },

  // fire with delta tuples in atom pos 0
  fire0(deltaTuples)
  {
    const wl0 = [[new Map(), []]]; // env + ptuples
    
    // atom deltapos 0 (X x) 
    const wl1 = [];
    for (const [env, ptuples] of wl0)
    {
      for (const Xtuple of deltaTuples)
      {
        // term 0 var 'x' [unbound]
        const x = Xtuple.x;
        wl1.push([Maps.put(env, 'x', x), Arrays.push(ptuples, Xtuple)]); // mutation iso. functional?
      }  
    }

    //atom 1 (I x y)
    const wl2 = [];
    for (const [env, ptuples] of wl1)
    {
      const wl2_1 = [];
      for (const Ituple of I.members)
      {
        // term 0 var 'x' [bound]
        const x = Ituple.x;
        const existingx = env.get('x');
        if (existingx === x)
        {
          wl2_1.push([env, Ituple]);
        }
      }
      
      // term 1 var 'y' [unbound]
      for (const [env, Ituple] of wl2_1)
      {
        const y = Ituple.y;
        wl2.push([Maps.put(env, 'y', y), Arrays.push(ptuples, Ituple)]); // mutation?
      }
    }
    
    // clause 2 z = y*y [unbound]
    const wl3 = [];
    for (const [env, ptuples] of wl2)
    {
      const y = env.get('y');
      wl3.push([Maps.put(env, 'z', y*y), ptuples]); // mutation?
    }

    /// bind head (R x sum<z>)
    const updates = new Map(); // groupby -> additionalValues
    for (const [env, ptuples] of wl3)
    {
      const x = env.get('x');
      const z = env.get('z');
      const productGB = new ProductGB(new Set(ptuples), env);
      const groupby = new Rule1.GroupBy(x);

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
          tuple2product(tuple, productGB); 
        }
        product2groupby(productGB, groupby);
      }
    }

    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple; // should be API
      const currentValue = currentResultTuple === null ? 0 : currentResultTuple.z;
      const updatedValue = additionalValues.reduce((acc, val) => acc + val, currentValue);
      const updatedResultTuple = new R(groupby.x, updatedValue);  
      groupby2tuple(groupby, updatedResultTuple);
    }
  },

  // fire with delta tuples in atom pos 1
  fire1(deltaTuples)
  {
    const wl0 = [[new Map(), []]]; // env + ptuples
    
    // atom 0 (X x) 
    const wl1 = [];
    for (const [env, ptuples] of wl0)
    {
      for (const Xtuple of X.members)
      {
        // term 0 var 'x' [unbound]
        const x = Xtuple.x;
        wl1.push([Maps.put(env, 'x', x), Arrays.push(ptuples, Xtuple)]);
      }  
    }

    //atom deltapos 1 (I x y)
    const wl2 = [];
    for (const [env, ptuples] of wl1)
    {
      const wl2_1 = [];
      for (const Ituple of deltaTuples)
      {
        // term 0 var 'x' [bound]
        const x = Ituple.x;
        const existingx = env.get('x');
        if (existingx === x)
        {
          wl2_1.push([env, Ituple]);
        }
      }
      
      // term 1 var 'y' [unbound]
      for (const [env, Ituple] of wl2_1)
      {
        const y = Ituple.y;
        wl2.push([Maps.put(env, 'y', y), Arrays.push(ptuples, Ituple)]);
      }
    }
    
    // clause 2 z = y*y [unbound]
    const wl3 = [];
    for (const [env, ptuples] of wl2)
    {
      const y = env.get('y');
      wl3.push([Maps.put(env, 'z', y*y), ptuples]); // mutation?
    }

    /// bind head (R x sum<z>)
    const updates = new Map(); // groupby -> additionalValues
    for (const [env, ptuples] of wl3)
    {
      const x = env.get('x');
      const z = env.get('z');
      const productGB = new ProductGB(new Set(ptuples), env);
      const groupby = new Rule1.GroupBy(x);

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
          tuple2product(tuple, productGB); 
        }
        product2groupby(productGB, groupby);
      }
    }

    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple; // should be API
      const currentValue = currentResultTuple === null ? 0 : currentResultTuple.z;
      const updatedValue = additionalValues.reduce((acc, val) => acc + val, currentValue);
      const updatedResultTuple = new R(groupby.x, updatedValue);  
      groupby2tuple(groupby, updatedResultTuple);
    }
  }

}

const rules = [Rule1];

class ProductGB
{

  static members = [];
  _outgb = null;

  constructor(tuples, env)
  {
    for (const member of ProductGB.members)
    {
      if (Sets.equals(member.tuples, tuples))
      {
        return member;
      }
    }
    this.tuples = tuples;
    this.env = env;
    this._id = ProductGB.members.length;
    ProductGB.members.push(this);
  }
}

function* tuples()
{
  for (const predicate of predicates)
  { 
    yield* predicate.members;
  }
}

function* productsGB()
{
  yield* ProductGB.members;
}

function* groupbys()
{
  for (const rule of rules)
  {
    yield* rule.GroupBy.members;
  }
}

function tuple2product(tuple, product)
{
  tuple._outproducts.add(product);
}

function product2groupby(product, groupby) // should become method
{
  assertTrue(product._outgb === null);
  product._outgb = groupby;
}

function product2tuple(product, tuple)
{

}

function groupby2tuple(groupby, tuple)
{
  groupby._outtuple = tuple;
}

function toDot()
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
    return gb.rule().name + gb._id;
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

  for (const productGB of productsGB())
  {
    const p = productTag(productGB);
    sb += `${p} [label="${[...productGB.env.entries()].map(entry => entry[0]+":"+termString(entry[1]))}"];\n`;
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



const xa = new X('a');
const i1 = new I(xa.x, 1);
const i2 = new I(xa.x, 2);
const i3 = new I('b', 3);

Rule1.fire1([i1, i2]);

console.log(toDot());

console.log("done");
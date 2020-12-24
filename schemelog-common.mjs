import { Sets, assertTrue } from './common.mjs';

export {
  assertTrue, Maps, Sets, MutableSets, Arrays
} from './common.mjs';

export function Product(rule, tuples)
{
  this.rule = rule;
  this.tuples = tuples;
  this._outtuple = null;
  // console.log("product created: " + this);
}
Product.prototype.toString =
  function ()
  {
    return this.rule.name + ":" + [...this.tuples].join('.');
  }
Product.prototype.equals =
  function (x)
  {
    if (this.rule !== x.rule
      || this.tuples.length !== x.tuples.length)
    {
      return false;
    }
    for (let i = 0; i < this.tuples.length; i++)
    {
      if (this.tuples[i] !== x.tuples[i])
      {
        return false;
      }
    }
    return true;
  }

export function ProductGB(rule, tuples, value)
{
  this.rule = rule;
  this.tuples = tuples;
  this.value = value;
  this._outtuple = null;
}
ProductGB.prototype.toString =
  function ()
  {
    return this.rule.name + ":" + [...this.tuples].join('.') + "=" + this.value;
  }


// constructor(rule, tuples)
// {
//   for (const member of Product.members)
//   {
//     if (member.rule === rule && Sets.equals(member.tuples, tuples))
//     {
//       return member;
//     }
//   }
//   Product.members.push(this);
// }

// export class ProductGB
// {

//   static members = [];
//   _outgb = null;

//   constructor(rule, tuples, value)
//   {
//     for (const member of ProductGB.members)
//     {
//       if (member.rule === rule && Sets.equals(member.tuples, tuples))
//       {
//         return member;
//       }
//     }
//     this.rule = rule;
//     this.tuples = tuples;
//     this.value = value;
//     this._id = ProductGB.members.length;
//     ProductGB.members.push(this);
//   }
// }


export function atomString(predicateName, ...termValues)
{
  return `${predicateName}(${termValues.map(termString).join(' ')})`;
}

export function termString(termValue)
{
  if (typeof termValue === "string")
  {
    return "'" + termValue + "'";
  }

  return String(termValue);
}


/////

export function reachableTuples(tuples)
{
  const seen = new Set();
  const wl = [...tuples];

  while (wl.length > 0)
  {
    const tuple = wl.pop();
    if (!seen.has(tuple))
    {
      seen.add(tuple);
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
  return seen;
}


export function sanityCheck(module)
{
  const tuples = new Set(module.tuples());
  const rtuples = reachableTuples(module.edbTuples());
  const sameTuples = Sets.equals(tuples, rtuples);
  if (!sameTuples)
  {
    console.log(`
    member tuples   : ${[...tuples].join(', ')}
    reachable tuples: ${[...rtuples].join(', ')}
    `);
  }
  assertTrue(sameTuples);

  // const products = new Set();
  // for (const tuple of tuples)
  // {
  //   for (const product of tuple._outproducts)
  //   {
  //     products.add(product);
  //   }
  // }


}


export function toDot(tuples_)
{

  function gbLabel(gb)
  {
    return gb;
  }

  function productLabel(product)
  {
    return product;
    // return product;
  }

  function productGBLabel(product)
  {
    return product;
  }

  let sb = "digraph G {\nnode [style=filled,fontname=\"Roboto Condensed\"];\n";

  const wl = [...tuples_];
  const seen = new Set();
  const tagMap = new Map();
  function getTag(obj)
  {
    let tag = tagMap.get(obj);
    if (tag !== undefined)
    {
      return tag;
    }
    tag = tagMap.size;
    tagMap.set(obj, tag);
    return tag;
  }

  while (wl.length > 0)
  {
    const tuple = wl.pop();
    if (seen.has(tuple))
    {
      continue;
    }
    seen.add(tuple);
    const t = getTag(tuple);
    sb += `${t} [shape=box label="${tuple}"];\n`;
    for (const product of tuple._outproducts)
    {
      sb += `${t} -> ${productTag(product)};\n`;    
      if (seen.has(product))
      {
        continue;     
      }
      seen.add(product);
      const p = getTag(product);
      sb += `${p} [label="${productLabel(product)}"];\n`;
      const tuple = product._outtuple;
      if (tuple !== null)
      {
        sb += `${p} -> ${getTag(tuple)};\n`;
        wl.push(tuple);
      }  
    }
    for (const productGB of tuple._outproductsgb)
    {
      sb += `${t} -> ${getTag(productGB)};\n`;
      if (seen.has(productGB))
      {
        continue;     
      }
      seen.add(productGB);  
      const p = getTag(productGB);
      sb += `${p} [label="${productLabel(productGB)}"];\n`;

      const groupby = productGB._outgb;
      const gb = getTag(groupby);
      sb += `${p} -> ${gb};\n`;      

      if (!seen.has(groupby))
      {
        seen.add(groupby);
        sb += `${gb} [shape=diamond label="${gbLabel(groupby)}"];\n`;
        const tuple = groupby._outtuple;
        if (tuple !== null)
        {
          sb += `${gb} -> ${getTag(tuple)};\n`;
          wl.push(tuple);
        }
      }
    }
  }

  sb += "}";
  return sb;
}

////// 

export function toTupleMap(tuples)
{
  const map = new Map();

  function add(tuple)
  {
    const key = tuple.constructor;
    const currentValue = map.get(key);
    if (currentValue === undefined)
    {
      map.set(key, [tuple]);
    }
    else
    {
      currentValue.push(tuple);
    }
  }
  tuples.forEach(add);
  return map;
}

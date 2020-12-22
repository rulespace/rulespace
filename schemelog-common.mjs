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
    return "p_" + product.rule.name + "_" + [...product.tuples].map(tupleTag).join('_');
  }

  function productLabel(product)
  {
    return product;
    // return product;
  }

  function productGBTag(product)
  {
    return "pgb_" + product.rule.name + "_" + [...product.tuples].map(tupleTag).join('_') + "_" + product.value;
  }

  function groupbyTag(gb)
  {
    return gb.rule().name + "gb" + gb._id;
  }
  

  let sb = "digraph G {\nnode [style=filled,fontname=\"Roboto Condensed\"];\n";

  const wl = [...tuples_];
  const seenTuples = new Set();
  const seenProducts = new Set();
  const seenProductsGB = new Set();

  while (wl.length > 0)
  {
    const tuple = wl.pop();
    if (seenTuples.has(tuple))
    {
      continue;
    }
    seenTuples.add(tuple);
    const t = tupleTag(tuple);
    sb += `${t} [shape=box label="${tuple}"];\n`;
    for (const product of tuple._outproducts)
    {
      sb += `${t} -> ${productTag(product)};\n`;    
      if (seenProducts.has(product))
      {
        continue;     
      }
      seenProducts.add(product);
      const p = productTag(product);
      sb += `${p} [label="${productLabel(product)}"];\n`;
      const tuple = product._outtuple;
      if (tuple !== null)
      {
        sb += `${p} -> ${tupleTag(tuple)};\n`;
        wl.push(tuple);
      }  
    }
    for (const productGB of tuple._outproductsgb)
    {
      sb += `${t} -> ${productGBTag(productGB)};\n`;
      if (seenProductsGB.has(productGB))
      {
        continue;     
      }
      seenProductsGB.add(productGB);  
      const p = productGBTag(productGB);
      sb += `${p} [label="${productGB.rule.name} ${productGB.value}"];\n`;

      const groupBy = productGB._outgb;
      sb += `${p} -> ${groupbyTag(groupBy)};\n`;      
      const gb = groupbyTag(groupby);
      sb += `${gb} [shape=diamond label="${groupby}"];\n`;
      const tuple = groupby._outtuple;
      if (tuple !== null)
      {
        sb += `${gb} -> ${tupleTag(tuple)};\n`;
        wl.push(tuple);
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

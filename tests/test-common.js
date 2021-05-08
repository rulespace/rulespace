import fs from 'fs';
import { Sets, assertTrue } from 'common';
import { SchemeParser, Pair, Null } from '../sexp-reader.js';
import { sexp2rsp  } from '../sexp2rsp.js';
import { rsp2js } from '../rsp2js.js';
import { Atom, Lit } from '../rsp.js';

export function compileToRsp(src)
{
  const parser = new SchemeParser();
  const sexp = parser.parse(src);
  const rsp = sexp2rsp(sexp);
  return rsp;
}

export function compileToConstructor(src, options)
{
  const rsp = compileToRsp(src);
  const compiled = rsp2js(rsp,  {...options, module:false});
  return Function(compiled);
}

export function compileToModule(src, name, options)
{
  const rsp = compileToRsp(src);
  const compiled = rsp2js(rsp, {...options, module:true});
  fs.writeFileSync(`./compiled/${name}.mjs`, compiled, 'utf8');
  name === undefined ? 'run' : name;
  return import(`./compiled/${name}.mjs`);
}

export function compileAtoms(src)
{
  const rsp = compileToRsp(src);
  return rsp.rules.map(rule => rule.head);
}

/* returns tuple object, not 'interned' tuple */
export function atomToFreshModuleTuple(module, atom)
{

  function attrToValue(attr)
  {
    if (attr instanceof Lit)
    {
      return attr.value;
    }
    if (attr instanceof Atom)
    {
      return atomToFreshModuleTuple(module, attr);
    }
    return attr;
  }

  return new module[atom.pred](...atom.terms.map(attrToValue));
}

/* returns 'fresh' module tuple objects, not 'interned' tuple */
export function compileModuleTuples(module, src)
{
  const atoms = compileAtoms(src);
  return atoms.map(atom => atomToFreshModuleTuple(module, atom));
}

// export function equals(x, y)
// {
//   if (x === null || x === undefined || y === null || y === undefined) { return x === y; }
//   if (x.constructor !== y.constructor) { return false; }
//   if (x instanceof Function) { return x === y; }
//   // if (x instanceof RegExp) { return x === y; }
//   if (x === y || x.valueOf() === y.valueOf()) { return true; }
//   if (Array.isArray(x) && x.length !== y.length) { return false; }

//   // if (x instanceof Date) { return false; }
//   if (!(x instanceof Object)) { return false; }
//   if (!(y instanceof Object)) { return false; }

//   const p = Object.keys(x);
//   return Object.keys(y).every(
//     function (i) { return p.indexOf(i) !== -1; }) &&
//       p.every(
//         function (i) {return equals(x[i], y[i])});
// }

// export class ArrayRegistry
// {
//   constructor(eq)
//   {
//     this.items = [];
//     this.eq = eq;
//   }

//   add(x)
//   {
//     const existing = this.get(x);
//     if (existing === undefined)
//     {
//       this.items.push(x);
//       return x;
//     }
//     return existing;
//   }

//   get(x)
//   {
//     return this.items.find(y => this.eq(x, y));
//   }

//   mapGet(x)
//   {
//     const existing = this.get(x);
//     if (existing === undefined)
//     {
//       return [];
//     }
//     return [existing];
//   }

// }


// export function equals(x, y) ORIGINAL
// {
//   if (x === null || x === undefined || y === null || y === undefined) { return x === y; }
//   if (x.constructor !== y.constructor) { return false; }
//   if (x instanceof Function) { return x === y; }
//   // if (x instanceof RegExp) { return x === y; }
//   if (x === y || x.valueOf() === y.valueOf()) { return true; }
//   if (Array.isArray(x) && x.length !== y.length) { return false; }

//   // if (x instanceof Date) { return false; }
//   if (!(x instanceof Object)) { return false; }
//   if (!(y instanceof Object)) { return false; }

//   const p = Object.keys(x);
//   return Object.keys(y).every(
//     function (i) { return p.indexOf(i) !== -1; }) &&
//       p.every(
//         function (i) {return equals(x[i], y[i])});
// }

// export function toModuleTupleFor(module)
// {
//   return function (x)
//   {
//     return toModuleTuple(module, x);
//   }
// }

// export function toModuleTuple(module, x)
// {
//   if (Array.isArray(x))
//   {
//     return new module[x[0]](...x.slice(1));
//   }
//   return new module[x.constructor.name](...Object.values(x));
// }

// export function toGenericTuple(tuple)
// {
//   if (Array.isArray(tuple))
//   {
//     return tuple;
//   }
//   const x = [tuple.constructor.name];
//   for (const name of Object.keys(tuple))
//   {
//     if (!name.startsWith('_'))
//     {
//       x.push(tuple[name]);
//     }
//   }
//   return x;
// }

export function tupleEquals(t1, t2)
{
  // if (t1.constructor.name !== t2.constructor.name)
  // {
  //   return false;
  // }

  // for (const name of Object.keys(t1))
  // {
  //   if (!name.startsWith('_'))
  //   {
  //     if (Object.keys(t2).indexOf(name) === -1)
  //     {
  //       return false;
  //     }
  //     if (t1[name] !== t2[i])
  //     {
  //       return false;
  //     }    }
  // }
  // return true;

  return String(t1) === String(t2);
}


// stuff below was in schemelog.js

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
      sb += `${t} -> ${getTag(product)};\n`;    
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
      sb += `${p} [label="${productGBLabel(productGB)}"];\n`;

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





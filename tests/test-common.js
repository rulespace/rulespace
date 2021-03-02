import fs from 'fs';
import { SchemeParser, Pair, Null } from '../sexp-reader.js';
import { sexp2rsp  } from '../sexp2rsp.js';
import { rsp2js } from '../rsp2js.js';

export function compileToConstructor(src, options)
{
  const parser = new SchemeParser();
  const sexp = parser.parse(src);
  const rsp = sexp2rsp(sexp);
  const compiled = rsp2js(rsp,  {...options, module:false});
  return Function(compiled);
}

export function compileToModule(src, name, options)
{
  const parser = new SchemeParser();
  const sexp = parser.parse(src);
  const rsp = sexp2rsp(sexp);
  const compiled = rsp2js(rsp, {...options, module:true});
  fs.writeFileSync(`./compiled/${name}.mjs`, compiled, 'utf8');
  name === undefined ? 'run' : name;
  return import(`./compiled/${name}.mjs`);
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
  // const t1 = toGenericTuple(x);
  // const t2 = toGenericTuple(y);
  if (t1.length !== t2.length)
  {
    return false;
  }
  if (t1[0] !== t2[0])
  {
    return false;
  }
  for (let i = 1; i < t1.length; i++)
  {
    if (t1[i] !== t2[i])
    {
      return false;
    }
  }
  return true;
}

// export class Unique
// {
//   constructor()
//   {
//     this.uniques = new Set();
//   }

//   tuple(x)
//   {
//     const xx = toGenericTuple(x);
//     for (const y of this.uniques)
//     {
//       if (genericTupleEquals(xx, y))
//       {
//         return y;
//       }
//     }
//     this.uniques.add(xx);
//     return xx;
//   }
  
//   set(tuples)
//   {
//     return new Set([...tuples].map(tuple => this.tuple(tuple)));
//   }
// }

// in: sequence of ground atoms, out: list of generic tuples
export function parseTuples(tupleSequenceSrc) // TODO should be folded into 'regular' parser
{

  function toValue(exp)
  {
    if (exp instanceof Pair)
    {
      if (exp.car.name === 'quote')
      {
        return exp.cdr.car.valueOf();
      }
    }
    return exp.valueOf(); // Number, String, ...
  }

  const parser = new SchemeParser();
  const seq = parser.parse(tupleSequenceSrc);
  if (seq instanceof Null)
  {
    return []; // TODO: turn Null into (empty) iterator?
  }
  return [...seq].map(tuple => [tuple.pred.name, ...tuple.terms.map(toValue)]);
}




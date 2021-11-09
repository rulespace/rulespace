import { str2sexp } from "./str2sexp.js";
import { sexp2rsp } from "./sexp2rsp.js";
import { rsp2js } from "./rsp2js.js";
import { MutableMaps } from "../common/common.js";

export { rsp2latex } from "./rsp2latex.js";


export function compileToRsp(src)
{
  const sexp = str2sexp(src);
  const rsp = sexp2rsp(sexp);
  return rsp;
}

export function compileToConstructor(src, options)
{
  const rsp = compileToRsp(src);
  const compiled = rsp2js(rsp,  {...options, module:false});
  return Function(compiled);
}

export function compileToModuleSrc(src, options)
{
  const rsp = compileToRsp(src);
  const compiled = rsp2js(rsp, {...options, module:true});
  return compiled;
}

export function instance2dot(instance)
{
  const tuples = [...instance.rootTuples()];
  return toDot(instance, tuples);
}

export function visitNodes(instance, tuples_, visitTuple, visitProduct, visitProductGb, visitGroupBy)
{
  const wl = [...tuples_];
  const seen = new Set();
  while (wl.length > 0)
  {
    const tuple = wl.pop();
    if (seen.has(tuple))
    {
      continue;
    }
    seen.add(tuple);
    if (!visitTuple(tuple))
    {
      continue;
    }
    for (const product of instance.outProducts(tuple))
    {
      if (seen.has(product))
      {
        continue;     
      }
      seen.add(product);
      if (!visitProduct(product))
      {
        continue;
      }
      const outTuple = instance.outTuple(product);
      if (outTuple !== null)
      {
        wl.push(outTuple);
      }  
    }
    for (const productGB of instance.outProductsGroupBy(tuple))
    {
      if (seen.has(productGB))
      {
        continue;     
      }
      seen.add(productGB);  
      if (!visitProductGb(productGB))
      {
        continue;
      }
      const groupby = instance.outGroupBy(productGB);
      if (!seen.has(groupby))
      {
        seen.add(groupby);
        if (!visitGroupBy(groupby))
        {
          continue;
        }
        const outTuple = instance.outTuple(groupby);
        if (outTuple !== null)
        {
          wl.push(outTuple);
        }
      }
    }
  }
}

export function visitLinks(instance, tuples_, visitTuple2Product, visitProduct2Tuple)
{
  const wl = [...tuples_];
  const seen = new Set();
  while (wl.length > 0)
  {
    const tuple = wl.pop();
    if (seen.has(tuple))
    {
      continue;
    }
    seen.add(tuple);
    // const t = getTag(tuple);
    for (const product of instance.outProducts(tuple))
    {
      // sb += `${t} -> ${getTag(product)};\n`;    
      if (seen.has(product))
      {
        continue;     
      }
      if (!visitTuple2Product(tuple, product))
      {
        continue;
      }
      seen.add(product);
      // const p = getTag(product);
      const outTuple = instance.outProduct(product);
      if (outTuple !== null)
      {
        // sb += `${p} -> ${getTag(outTuple)};\n`;
        if (!visitProduct2Tuple(product, outTuple))
        {
          continue;
        }
        wl.push(outTuple);
      }  
    }
    // for (const productGB of instance.outProductsGroupBy(tuple))
    // {
    //   //sb += `${t} -> ${getTag(productGB)};\n`;
    //   if (seen.has(productGB))
    //   {
    //     continue;     
    //   }
    //   seen.add(productGB);  
    //   if (!visitProductGb(productGB))
    //   {
    //     continue;
    //   }
    //   // const p = getTag(productGB);
    //   const groupby = instance.outGroupBy(outgb);
    //   // const gb = getTag(groupby);
    //   // sb += `${p} -> ${gb};\n`;      
    //   if (!seen.has(groupby))
    //   {
    //     seen.add(groupby);
    //     if (!visitGroupBy(groupby))
    //     {
    //       continue;
    //     }
    //     const outTuple = instance.outTuple(groupby);
    //     if (outTuple !== null)
    //     {
    //       // sb += `${gb} -> ${getTag(outTuple)};\n`;
    //       wl.push(outTuple);
    //     }
    //   }
    // }
  }
}



//////


function toDot(instance, tuples = instance.tuples())
{

  function valueLabel(value)
  {
    if (value instanceof Function)
    {
      return '<function>';
    }
    if (value._outproducts)
    {
      return tupleLabel(value);
    }
    if (typeof value === 'string')
    {
      return `\\"${value}\\"`
    }
    return value;
  }

  function tupleLabel(tuple)
  {
    return `[${tuple.constructor.name} ${tuple.values().map(valueLabel).join(' ')}]`;
  }

  function gbLabel(gb)
  {
    return gb;
  }

  function productLabel(product)
  {
    return product.constructor.name;
  }

  function productGBLabel(product)
  {
    return product.constructor.name;
  }
  
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
  
  let sb = "digraph G {\nnode [style=filled,fontname=\"Roboto Condensed\"];\n";
  visitNodes(instance, tuples,
    tuple => { 
      sb += `${getTag(tuple)} [shape=box label="${tupleLabel(tuple)}"];\n`;
      instance.outProducts(tuple).forEach(product => sb += `${getTag(tuple)} -> ${getTag(product)};\n`);
      instance.outProductsGroupBy(tuple).forEach(productGb => sb += `${getTag(tuple)} -> ${getTag(productGb)};\n`);
      return true;
    },
    product => {
      sb += `${getTag(product)} [label="${productLabel(product)}" color="0.650 0.200 1.000"];\n`;
      sb += `${getTag(product)} -> ${getTag(instance.outTuple(product))};\n`;
      return true;
    },
    productGb => {
      sb += `${getTag(productGb)} [label="${productGBLabel(productGb)}"];\n`;
      sb += `${getTag(productGb)} -> ${getTag(instance.outGroupBy(productGb))};\n`;      
      return true;
    },
    groupBy => {
      sb += `${getTag(groupBy)} [shape=diamond label="${gbLabel(groupBy)}"];\n`;
      const outTuple = instance.outTuple(groupBy);
      if (outTuple !== null)
      {
        sb += `${getTag(groupBy)} -> ${getTag(outTuple)};\n`;
      }
      return true;
    });
  sb += "}";

  return sb;
}

////////////


export function reactive(instanceCtr, deltaObservers)
{
  return function ()
  {
    function notify(delta)
    {
      deltaObservers.forEach(observer => observer.observe(instance, delta));
      return delta;
    }

    const instance = instanceCtr();
    notify({
      added() {return instance.toTupleMap(instance.tuples())},
      removed() {return new Map()}
    });

    function wrap(method)
    {
      return function (...args)
      {
        const delta = method.apply(instance, args);
        notify(delta);
      }
    }

    const intercept = ['addTupleMap', 'addTuples', 'removeTupleMap', 'removeTuples'];
    const wrappedMethods = new Map(intercept.map(name => 
      [name, wrap(instance[name])]
    ));

    return new Proxy(instance, {
      get: function (target, prop)
      {
        return wrappedMethods.get(prop) ?? Reflect.get(target, prop);
      }
    }) 
  }
}



// // linear composition of instances
// export function linear(instances)
// {
//   if (instances.length === 1)
//   {
//     return instances[0];
//   }
//   const rest = linear.call(null, instances.slice(1));
//   const ds = deltaSource(instances[0]);
//   ds.addDeltaObserver(rest.computeDelta);
//   return rest;
// }


export function computeMeta(instance) // single-shot
{

  const src = `

  (rule [TupleLink t1 t2] [Tuple2Product t1 p] [Product2Tuple p t2])
  (rule [Tuple t1 pred] [TupleLink t1 _] (:= pred (Reflect.get (Reflect.get t1 "constructor") "name")))
  (rule [Tuple t2 pred] [TupleLink _ t2] (:= pred (Reflect.get (Reflect.get t2 "constructor") "name")))

  `;

  const ctr = compileToConstructor(src);
  const meta = ctr();

  visitNodes(instance, instance.tuples(), 
    tuple => meta.addTuples(instance.outProducts(tuple).map(p => new meta.Tuple2Product(tuple, p))),
    product => meta.addTuples([instance.outTuple(product)].map(t => new meta.Product2Tuple(product, t)))
    );

  return meta;
}

//// constructor composition


//// instance composition 

// export function metaSpace(instance)
// {

//   const src = `

//   (rule [TupleLink t1 t2] [Tuple2Product t1 p] [Product2Tuple p t2])
//   (rule [Tuple t1] [TupleLink t1 _])
//   (rule [Tuple t2] [TupleLink _ t2])

//   `;

//   const ctr = compileToConstructor(src);
//   const meta = ctr();

//   const initialMetaMap = new Map();

//   visitLinks(meta, meta.tuples(), 
//     (tuple, product) => MutableMaps.putPushArray(initialMetaMap, meta.Tuple2Product, new meta.Tuple2Product(tuple, product)),
//     (product, tuple) => MutableMaps.putPushArray(initialMetaMap, meta.Product2Tuple, new meta.Product2Tuple(product, tuple)))

//   const initialDelta = 

//   const compoundInstance = {
//   }

//   return { initialDelta, compoundInstance }
// }





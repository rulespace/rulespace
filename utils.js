import { str2sexp } from "./str2sexp.js";
import { sexp2rsp } from "./sexp2rsp.js";
import { rsp2js } from "./rsp2js.js";

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
  return toDot(tuples);
}


//////


function toDot(tuples_)
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
    // return product;
  }

  function productGBLabel(product)
  {
    return product.constructor.name;
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
    sb += `${t} [shape=box label="${tupleLabel(tuple)}"];\n`;
    for (const product of tuple._outproducts)
    {
      sb += `${t} -> ${getTag(product)};\n`;    
      if (seen.has(product))
      {
        continue;     
      }
      seen.add(product);
      const p = getTag(product);
      sb += `${p} [label="${productLabel(product)}" color="0.650 0.200 1.000"];\n`;
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




////////////


export function deltaSource(instance)
{
  const deltaObservers = [];
  function notify(delta)
  {
    deltaObservers.forEach(observer => observer.observe(delta));
    return delta;
  }
  return {
    addTupleMap(addTuples)
    { 
      return notify(instance.addTupleMap(addTuples));
    },
    addTuples(addTuples)
    { 
      return notify(instance.addTuples(addTuples));
    },
    removeTupleMap(removeTuples)
    { 
      return notify(instance.removeTupleMap(removeTuples));
    },
    removeTuples(removeTuples)
    { 
      return notify(instance.removeTuples(removeTuples));
    },

    ////

    addDeltaObserver(observer)
    {
      if (!deltaObservers.includes(observer))
      {
        deltaObservers.push(observer);
      }
    }

  }
}

export function linear(instances)
{
  if (instances.length === 1)
  {
    return instances[0];
  }
  const rest = linear.call(null, instances.slice(1));
  const ds = deltaSource(instances[0]);
  ds.addDeltaObserver(rest.computeDelta);
  return rest;
}


// meta bridge
// for now this is a clunky way of doing meta stuff
// TODO: merge this into rulespace itself ("(re)actively" coupled)
export function metaInstance(instance, tuples = instance.rootTuples())
{
  const metaInstance = new meta();
  const seen = new Set();
  const wl = [...tuples];
  const metaTuples = [];
  while (wl.length > 0)
  {
    const tuple = wl.pop();
    if (seen.has(tuple))
    {
      continue;
    }
    const relationName = tuple.constructor.name;
    const values = tuple.values();
    metaTuples.push(new metaInstance.relation(relationName, values.length)); // TODO: for every `tuple` a `relation` is pushed, which is semantically ok but a bit wasteful
    metaTuples.push(new metaInstance.tuple(tuple, relationName));
    values.forEach((value, i) => metaTuples.push(new metaInstance.tuple_value(value, tuple, i)));
    for (const product of instance.outProducts(tuple))
    {
      productTuples.forEach((productTuple, i) => metaTuples.push(new metaInstance.product_tuple(productTuple, product, i)));
      if (seen.has(product))
      {
        continue;     
      }
      seen.add(product);
      const productTuples = product.tuples();
      const rule = product.constructor.name; // placeholder
      const tuple_out = instance.outTuple(product);
      metaTuples.push(new metaInstance.rule(rule, productTuples.length)); 
      metaTuples.push(new metaInstance.product(product, rule, tuple_out));
      if (tuple_out !== null)
      {
        wl.push(tuple_out);
      }  
    }
    // for (const productGB of instance.outProductsGroupBy(tuple))
    // {
    //   MutableMaps.putPushArray(pgraph, tuple, productGB);
    //   if (seen.has(productGB))
    //   {
    //     continue;     
    //   }
    //   seen.add(productGB);  
    //   const groupby = instance.outGroupBy(productGB);
    //   MutableMaps.putPushArray(pgraph, productGB, groupby);
    //   if (!seen.has(groupby))
    //   {
    //     seen.add(groupby);
    //     const outTuple = instance.outTuple(groupby);
    //     if (outTuple !== null)
    //     {
    //       MutableMaps.putPushArray(pgraph, groupby, outTuple);
    //       wl.push(outTuple);
    //     }
    //   }
    // }
  }
  metaInstance.addTuples(metaTuples);
  return metaInstance;
}





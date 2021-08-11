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




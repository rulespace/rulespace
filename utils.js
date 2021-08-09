import { str2sexp } from "./str2sexp.js";
import { sexp2rsp } from "./sexp2rsp.js";
import { rsp2js } from "./rsp2js.js";


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
}




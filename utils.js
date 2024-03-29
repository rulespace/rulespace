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
  return compiled;
}

//////////// unstable, experimental

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
        return delta;
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





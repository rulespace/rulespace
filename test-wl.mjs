import { performance } from 'perf_hooks';
import { assertTrue, Sets } from './common.mjs';
import { compileToConstructor, Unique, toModuleTuple, toModuleTupleFor } from './test-common.mjs';


class AddTuple
{
  constructor(tuple)
  {
    this.tuple = tuple;
  }

  applyToModule(module)
  {
    const mTuple = toModuleTuple(module, this.tuple);
    module.add_tuples([mTuple]);
  }

  applyToSet(set)
  {
    set.add(this.tuple);
  }
}
class RemoveTuple
{
  constructor(tuple)
  {
    this.tuple = tuple;
  }
}

export function addTuple(tuple)
{
  return new AddTuple(tuple);
}

export function removeTuple(tuple)
{
  return new RemoveTuple(tuple);
}


export function run(src, edbTuples, wl)
{
  const ctr = compileToConstructor(src);
  const unique = new Unique();
  
  const imodule = ctr();
  imodule.add_tuples(edbTuples.map(toModuleTupleFor(imodule)));
  
  const nonincremental = new Set(edbTuples);
  
  for (const delta of wl)
  {
    delta.applyToSet(nonincremental);
    const nimodule = ctr();
    nimodule.add_tuples([...nonincremental].map(toModuleTupleFor(nimodule)));
    
    delta.applyToModule(imodule);
  
    assertTrue(Sets.equals(unique.set(nimodule.edbTuples()), unique.set(imodule.edbTuples())));
    if (!Sets.equals(unique.set(nimodule.tuples()), unique.set(imodule.tuples())))
    {
      console.error("expected " + [...nimodule.tuples()].length + " tuples");
      console.error("got      " + [...imodule.tuples()].length + " tuples ");
      console.error("ni only: " + [...Sets.difference(unique.set(nimodule.tuples()), unique.set(imodule.tuples()))])
      console.error("i  only: " + [...Sets.difference(unique.set(imodule.tuples()), unique.set(nimodule.tuples()))])
      throw new Error();
    }
  }
  
  const module = ctr(); // actual "performance" module
  const start = performance.now();
  for (const delta of wl)
  {
    delta.applyToModule(module);
  }
  const duration = performance.now() - start;
  
  console.log("done: " + duration + "ms");  
}

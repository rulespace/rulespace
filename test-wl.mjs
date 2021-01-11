import { compileToConstructor, compileToModule, Unique, toModuleTuple } from './test-common.mjs';
import { toDot, sanityCheck } from './schemelog-common.mjs';
import { assertTrue, Sets } from './common.mjs';


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

// function getModuleTuples(tuples)
// {
//   return new Set([...tuples].flatMap(tuple => tuple.get() === null ? [] : [tuple.get()]));
// }
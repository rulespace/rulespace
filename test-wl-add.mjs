import { performance } from 'perf_hooks';
import { assertTrue, Sets } from './common.mjs';
import { compileToConstructor, Unique, toModuleTupleFor } from './test-common.mjs';
import { addTuple, removeTuple } from './test-wl.mjs';

const src = `
(define [Reachable x y]
  [Link x y])
  
(define [Reachable x y]
  [Link x z] [Reachable z y])
`;

const ctr = compileToConstructor(src);

const unique = new Unique();

const link = (x,y) => ['Link', x, y];

const edbTuples = [link('a', 'b'), link('b', 'c'), link('c', 'c'), link('c', 'd')];

const wl = [
  [// addTuple(link('d', 'e')),
  // addTuple(link('e', 'f')),
  // addTuple(link('f', 'g')),
  // addTuple(link('g', 'h')),
  // addTuple(link('h', 'i')),
  addTuple(link('m', 'n')),
  addTuple(link('l', 'm')),
  // addTuple(link('k', 'l')),
  // addTuple(link('j', 'k')),
  // addTuple(link('i', 'j')),
  // addTuple(link('o', 'p')),
  // addTuple(link('q', 'r')),
  // addTuple(link('p', 'q')),
  // addTuple(link('s', 'u')),
  // addTuple(link('s', 't')),
  // addTuple(link('t', 'u')),
  // addTuple(link('v', 'w')),
  // addTuple(link('v', 'x')),
  // addTuple(link('w', 'x')),
  // addTuple(link('y', 'y')),
  // addTuple(link('y', 'x')),
  // addTuple(link('y', 'z')),
  // addTuple(link('z', 'a'))
];

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

const start = performance.now();

const duration = performance.now() - start;

console.log("done: " + duration + "ms");


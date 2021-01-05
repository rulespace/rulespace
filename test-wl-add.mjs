import { performance } from 'perf_hooks';
import { compileToConstructor } from './test-common.mjs';
import { toDot, toTupleMap } from './schemelog-common.mjs';

const src = `
(define [Reachable x y]
  [Link x y])
  
(define [Reachable x y]
  [Link x z] [Reachable z y])
`;

const module = compileToConstructor(src)();

const link = (x, y) => new module.Link(x, y);

const edbTuples = new Set([link('a', 'b'), link('b', 'c'), link('c', 'c'), link('c', 'd')]);
module.add_tuples(toTupleMap(edbTuples));
const add_wl = [
  link('d', 'e'),
  link('e', 'f'),
  link('f', 'g'),
  link('g', 'h'),
  link('h', 'i'),
  link('m', 'n'),
  link('l', 'm'),
  link('k', 'l'),
  link('j', 'k'),
  link('i', 'j'),
  link('o', 'p'),
  link('q', 'r'),
  link('p', 'q'),
  link('s', 'u'),
  link('s', 't'),
  link('t', 'u'),
  link('v', 'w'),
  link('v', 'x'),
  link('w', 'x'),
  link('y', 'y'),
  link('y', 'x'),
  link('y', 'z'),
  link('z', 'a') ];

const start = performance.now();
for (const tuple of add_wl)
{
  module.add_tuples(new Map([[module.Link, [tuple]]]));
}
const duration = performance.now() - start;

console.log("done: " + duration + "ms");


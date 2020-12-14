import { performance } from 'perf_hooks';
import {link, addTuples, tuples, toDot} from './example2.mjs';

const edbTuples = new Set([link('a', 'b'), link('b', 'c'), link('c', 'c'), link('c', 'd')]);
addTuples(edbTuples);
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
  addTuples([tuple]);
}
const duration = performance.now() - start;


console.log(tuples())

console.log(toDot());

console.log("done: " + duration + "ms");


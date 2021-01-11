import { addTuple, removeTuple, run } from './test-wl.mjs';

const src = `
(define [Reachable x y]
  [Link x y])
  
(define [Reachable x y]
  [Link x z] [Reachable z y])
`;

const link = (x,y) => ['Link', x, y];
const edbTuples = [link('a', 'b'), link('b', 'c'), link('c', 'c'), link('c', 'd')];

const wl = [
  addTuple(link('d', 'e')),
  addTuple(link('e', 'f')),
  addTuple(link('f', 'g')),
  addTuple(link('g', 'h')),
  addTuple(link('h', 'i')),
  addTuple(link('m', 'n')),
  addTuple(link('l', 'm')),
  addTuple(link('k', 'l')),
  addTuple(link('j', 'k')),
  addTuple(link('i', 'j')),
  addTuple(link('o', 'p')),
  addTuple(link('q', 'r')),
  addTuple(link('p', 'q')),
  addTuple(link('s', 'u')),
  addTuple(link('s', 't')),
  addTuple(link('t', 'u')),
  addTuple(link('v', 'w')),
  addTuple(link('v', 'x')),
  addTuple(link('w', 'x')),
  addTuple(link('y', 'y')),
  addTuple(link('y', 'x')),
  addTuple(link('y', 'z')),
  addTuple(link('z', 'a'))
];

run(src, edbTuples, wl);
import { addTuple, removeTuple, run } from './test-wl.mjs';

const src = `
(define [Reachable x y]
  [Link x y])
  
(define [Reachable x y]
  [Link x z] [Reachable z y])

(define [Node x]
  [Link x _])
  
(define [Node y]
  [Link _ y])

(define [Unreachable x y]
  [Node x] [Node y] (not [Reachable x y]))
`;

const link = (x,y) => ['Link', x, y];
const edbTuples = [];

const wl = [
  addTuple(link('a', 'b')),
  addTuple(link('b', 'c')),
  addTuple(link('c', 'c')),
  addTuple(link('c', 'd')),
  addTuple(link('d', 'e')),
  addTuple(link('e', 'f')),
  removeTuple(link('e', 'f')),
  addTuple(link('f', 'g')),
  addTuple(link('g', 'h')),
  addTuple(link('h', 'i')),
  addTuple(link('m', 'n')),
  addTuple(link('l', 'm')),
  removeTuple(link('f', 'g')),
  removeTuple(link('b', 'c')),
  addTuple(link('k', 'l')),
  addTuple(link('j', 'k')),
  addTuple(link('k', 'k')),
  addTuple(link('i', 'j')),
  addTuple(link('o', 'p')),
  removeTuple(link('h', 'i')),
  addTuple(link('q', 'r')),
  addTuple(link('p', 'q')),
  removeTuple(link('j', 'k')),
  removeTuple(link('k', 'l')),
  addTuple(link('s', 'u')),
  addTuple(link('s', 't')),
  addTuple(link('t', 'u')),
  removeTuple(link('a', 'b')),
  addTuple(link('v', 'w')),
  removeTuple(link('p', 'q')),
  removeTuple(link('o', 'p')),
  addTuple(link('v', 'x')),
  removeTuple(link('k', 'k')),
  removeTuple(link('s', 'u')),
  removeTuple(link('m', 'n')),
  removeTuple(link('l', 'm')),
  addTuple(link('w', 'x')),
  removeTuple(link('c', 'd')),
  addTuple(link('y', 'y')),
  removeTuple(link('s', 't')),
  removeTuple(link('g', 'h')),
  addTuple(link('y', 'x')),
  removeTuple(link('i', 'j')),
  addTuple(link('y', 'z')),
  removeTuple(link('c', 'c')),
  removeTuple(link('t', 'u')),
  addTuple(link('z', 'a')),
  removeTuple(link('q', 'r')),
  removeTuple(link('d', 'e')),
  removeTuple(link('v', 'w')),
  removeTuple(link('v', 'x')),
  removeTuple(link('w', 'x')),
  removeTuple(link('y', 'y')),
  removeTuple(link('y', 'x')),
  removeTuple(link('y', 'z')),
  removeTuple(link('z', 'a')),
];

run(src, edbTuples, wl);
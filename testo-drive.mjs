import {X, I, R, addTuples, toDot} from './testo.mjs';

const xa = new X('a');
const i1 = new I('a', 1);
const i2 = new I('a', 2);
const i3 = new I('b', 3);

addTuples([xa, i1, i2, i3]);

console.log(toDot());

console.log("done");


import {X, I, Link, addTuples, toDot} from './testo.mjs';

// const xa = X('a');
// const i1 = I('a', 1);
// const i2 = I('a', 2);
// const i3 = I('b', 3);
// addTuples([xa, i1, i2, i3]);

const Lab = Link('a', 'b');
const Lbc = Link('b', 'c');
addTuples([Lab, Lbc]);

console.log(toDot());

console.log("done");


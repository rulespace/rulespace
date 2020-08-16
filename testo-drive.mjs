import {link, addTuples, toDot} from './example1.mjs';

// const xa = X('a');
// const i1 = I('a', 1);
// const i2 = I('a', 2);
// const i3 = I('b', 3);
// addTuples([xa, i1, i2, i3]);

const Lab = link('a', 'b');
const Lbc = link('b', 'c');
addTuples([Lab, Lbc]);

console.log(toDot());

console.log("done");


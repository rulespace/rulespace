import {link, addTuples, toDot} from './example4.mjs';


const Lab = link('a', 'b');
const Lbc = link('b', 'c');
addTuples([Lab, Lbc]);

console.log(toDot());

console.log("done");


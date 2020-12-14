import {link, addTuples, removeTuples, tuples, toDot} from './example2.mjs';

const edbTuples = new Set([link('a', 'b'), link('b', 'c')]);
addTuples(edbTuples);

console.log(toDot());


removeTuples([link('b', 'c')]);


console.log(toDot());
console.log([...tuples()].join(", "));
console.log("done");


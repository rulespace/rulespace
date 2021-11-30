import { compileToConstructor } from '../utils.js';

const src =
`
(rule [Raining] [Precipitation a] (>= a 90))
(rule [Precipitation 13])
(rule [Precipitation 55])
(rule [Precipitation 88])
(rule [Precipitation 94])
`;

const ctr = compileToConstructor(src);
const instance = ctr();

console.log(`tuples: ${[...instance.tuples()]}`);

const tuples_to_remove = instance.tuples().filter(t => t.name() === 'Precipitation' && t.values()[0] >= 90);
const delta = instance.removeTuples(tuples_to_remove);
console.log(`removed tuples: ${[...delta.removed().values()]}`);
// [Precipitation 94],[Raining ]
console.log(`remaining tuples: ${[...instance.tuples()]}`);
// [Precipitation 13],[Precipitation 55],[Precipitation 88]

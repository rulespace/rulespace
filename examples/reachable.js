import { compileToConstructor } from '../utils.js';

const src =
`
(rule [Reachable x y] [Link x y])
(rule [Reachable x y] [Reachable x z] [Link z y])
`;

const ctr = compileToConstructor(src);
const instance = ctr();

const lab = new instance.Link("a", "b");
const lbc = new instance.Link("b", "c");

const delta1 = instance.addTuples([lab, lbc]);
console.log("added tuples", [...delta1.added().values()].join());
// [Link a b],[Link b c],[Reachable a b],[Reachable b c],[Reachable a c]

const delta2 = instance.removeTuples([lab].map(t => t.get()));
console.log("removed tuples", [...delta2.removed().values()].join());
// [Link a b],[Reachable a b],[Reachable a c]
console.log("remaining tuples", [...instance.tuples()].join());
// [Link b c],[Reachable b c]

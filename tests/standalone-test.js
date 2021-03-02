import { sanityCheck } from '../schemelog-common.js';
import { compileToModule, parseTuples } from './test-common.js';


const src =
`
(rule [X a b]
  [I _ _ a _ _ b _ ])

`;

compileToModule(src, 'standalone', {debug:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {
  const edbTuples = parseTuples(`[I 0 1 2 3 4 5 6]`);
// const edbTuples = parseTuples(`[Link "a" "b"] [Link "b" "c"] [Link "c" "c"]`);
// const edbTuples = parseTuples(`[I 'a 10] [I 'a 20] [I 'b 33]`);
const delta1a = module.addTuples(edbTuples);
// const delta2 = module.removeTuples(parseTuples(`[Link "c" "c"] [Link "c" "d"] [Link "b" "c"]`));
// console.log(toDot(module.edbTuples()));
console.log("edb tuples: " + [...module.edbTuples()].join(' ++ '));
console.log("tuples: " + [...module.tuples()].join('\n'));

sanityCheck(module);
})

// [Link a b],[Link c b],
// [Node a],[Node c],[Node b],
// [Reachable a b],[Reachable c b],
// [Unreachable a a],[Unreachable a c],[Unreachable c a],[Unreachable c c],[Unreachable b a],[Unreachable b c],[Unreachable b b]

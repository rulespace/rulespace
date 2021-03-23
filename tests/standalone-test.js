import { sanityCheck } from '../schemelog-common.js';
import { compileToModule, parseTuples } from './test-common.js';


const src =
`
(rule [Rsum x #:sum y]
  [I x z] [J z y])

(rule [Rmax x #:max y]
  [I x z] [J z y])
`;



compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {
module.addTuples(parseTuples(`[I 'a 'aa] [J 'aa 10]  [J 'bb 20] [I 'a 'bb]`));
// const edbTuples = parseTuples(`[Link "b" "c"] [Link "c" "b"] [Link "c" "c"]`);
// module.addTuples(parseTuples(`[I 'a 'bb]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
sanityCheck(module);

// module.removeTuples(parseTuples(`[A 2] [A2 2]`)); 
// console.log("tuples: " + [...module.tuples()].join('\n'));

sanityCheck(module);
})

// [Link a b],[Link c b],
// [Node a],[Node c],[Node b],
// [Reachable a b],[Reachable c b],
// [Unreachable a a],[Unreachable a c],[Unreachable c a],[Unreachable c c],[Unreachable b a],[Unreachable b c],[Unreachable b b]

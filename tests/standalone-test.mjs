import { sanityCheck } from '../schemelog-common.mjs';
import { compileToModule, parseTuples } from './test-common.mjs';

const src =
`
(rule [Reachable x y]
  [Link x y])
  
(rule [Reachable x y]
  [Link x z] [Reachable z y])

(rule [Node x]
  [Link x _])
  
(rule [Node y]
  [Link _ y])

(rule [Unreachable x y]
  [Node x] [Node y] (not [Reachable x y]))
`;

compileToModule(src, 'standalone', {debug:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {
  const edbTuples = parseTuples(`[Link "a" "b"] [Link "b" "c"] [Link "c" "b"] [Link "c" "c"] [Link "c" "d"]`);
  // const edbTuples = parseTuples(`[Link "a" "b"] [Link "b" "c"] [Link "c" "c"]`);
  // const edbTuples = parseTuples(`[I 'a 10] [I 'a 20] [I 'b 33]`);
  const delta1a = module.addTuples([edbTuples[0]]);
  const delta1b = module.addTuples([edbTuples[1]]);
  const delta1c = module.addTuples([edbTuples[2]]);
  // const delta2 = module.removeTuples(parseTuples(`[Link "c" "c"] [Link "c" "d"] [Link "b" "c"]`));
// console.log(toDot(module.edbTuples()));
console.log("tuples: " + [...module.tuples()]);

sanityCheck(module);
})

// [Link a b],[Link c b],
// [Node a],[Node c],[Node b],
// [Reachable a b],[Reachable c b],
// [Unreachable a a],[Unreachable a c],[Unreachable c a],[Unreachable c c],[Unreachable b a],[Unreachable b c],[Unreachable b b]

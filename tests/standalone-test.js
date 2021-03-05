import { sanityCheck } from '../schemelog-common.js';
import { compileToModule, parseTuples } from './test-common.js';


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
  
(rule [Unreachable2 x y]
  [Node x] [Node y] (not [Reachable x y]))
      
`;

compileToModule(src, 'standalone', {debug:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {
const edbTuples = parseTuples(`[Link 'a 'b]`);
const delta1a = module.addTuples(edbTuples);
// const delta2 = module.removeTuples(parseTuples(`[Link "c" "c"] [Link "c" "d"] [Link "b" "c"]`));
// console.log(toDot(module.edbTuples()));
console.log("tuples: " + [...module.tuples()].join('\n'));

sanityCheck(module);
})

// [Link a b],[Link c b],
// [Node a],[Node c],[Node b],
// [Reachable a b],[Reachable c b],
// [Unreachable a a],[Unreachable a c],[Unreachable c a],[Unreachable c c],[Unreachable b a],[Unreachable b c],[Unreachable b b]

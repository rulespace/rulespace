import { compileToModule, parseTuples, toModuleTupleFor } from './test-common.mjs';

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

compileToModule(src, 'standalone', {profile:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {
const edbTuples = parseTuples(`[Link "a" "b"] [Link "b" "c"] [Link "c" "b"] [Link "c" "c"] [Link "c" "d"]`);
module.add_tuples(edbTuples.map(toModuleTupleFor(module)));
module.remove_tuples(parseTuples(`[Link "c" "c"] [Link "c" "d"] [Link "b" "c"]`).map(toModuleTupleFor(module)).map(t => t.get()));
// console.log(toDot(module.edbTuples()));
console.log("tuples: " + [...module.tuples()]);
console.log("profile: ", module.profileResults());
})

// [Link a b],[Link c b],
// [Node a],[Node c],[Node b],
// [Reachable a b],[Reachable c b],
// [Unreachable a a],[Unreachable a c],[Unreachable c a],[Unreachable c c],[Unreachable b a],[Unreachable b c],[Unreachable b b]
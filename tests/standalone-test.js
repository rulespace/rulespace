import { compileToModule, sanityCheck, compileModuleTuples } from './test-common.js';

const src =
`
(rule [Reachable x y]
  [Link x y])
  
(rule [Reachable x y]
  [Reachable x z] [Link z y])
`;

compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {
// const edbTuples = parseTuples(`[Link "b" "c"] [Link "c" "b"] [Link "c" "c"]`);
module.addTuples(compileModuleTuples(module, `[Link 1 2]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
sanityCheck(module);

module.removeTuples(compileModuleTuples(module, `[Link 1 2]`).map(t => t.get())); 
console.log("tuples: " + [...module.tuples()].join('\n'));

sanityCheck(module);
})

// [Link a b],[Link c b],
// [Node a],[Node c],[Node b],
// [Reachable a b],[Reachable c b],
// [Unreachable a a],[Unreachable a c],[Unreachable c a],[Unreachable c c],[Unreachable b a],[Unreachable b c],[Unreachable b b]

import { compileToModule, sanityCheck, compileModuleTuples } from './test-common.js';

const src = `

(rule [Reachable x y] [Link x y])
(rule [Reachable x y] [Reachable x z] [Link z y])

`;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {

module.addTuples(compileModuleTuples(module, `[Link "a" "b"] [Link "b" "c"]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log("roots: " + [...module.rootTuples()].join('\n'));
sanityCheck(module);

console.log("\n\n\n");
module.removeTuples(compileModuleTuples(module, `[Link "a" "b"]`).map(t => t.get())); 
console.log("tuples: " + [...module.tuples()].join('\n'));
sanityCheck(module);
})


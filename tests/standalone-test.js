import { compileModuleTuples, compileToModule, sanityCheck } from './test-common.js';

const src = `

(rule [R x y] [L x y])
(rule [R x y] [R x z] [L z y])

  `;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {

module.addTuples(compileModuleTuples(module, `[L 1 2] [L 2 3]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log("roots: " + [...module.rootTuples()].join('\n'));
sanityCheck(module); // reachableTuples is not always equal to members

// console.log("\n\n\n");
// module.removeTuples(compileModuleTuples(module, `[Link "a" "b"]`).map(t => t.get())); 
// console.log("tuples: " + [...module.tuples()].join('\n'));
// sanityCheck(module);
})


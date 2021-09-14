import { compileModuleTuples, compileToModule, sanityCheck } from './test-common.js';

const src = `

(rule [R a b c d e f g] [I a b c e [S a c d f] a b d g])

  `;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {

module.addTuples(compileModuleTuples(module, `[I 1 2 3 5 [S 1 3 4 6] 1 2 4 7]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log("roots: " + [...module.rootTuples()].join('\n'));
sanityCheck(module);

// console.log("\n\n\n");
// module.removeTuples(compileModuleTuples(module, `[Link "a" "b"]`).map(t => t.get())); 
// console.log("tuples: " + [...module.tuples()].join('\n'));
// sanityCheck(module);
})


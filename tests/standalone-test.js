import { compileToModule, sanityCheck, compileModuleTuples } from './test-common.js';

const src = `

(rule [P "even?" even?])
(rule [R x] [P "even?" proc] (:= x (proc 3)))

`;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {

// module.addTuples(compileModuleTuples(module, `[I 5]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log("roots: " + [...module.rootTuples()].join('\n'));
sanityCheck(module);

// console.log("\n\n\n");
// module.removeTuples(compileModuleTuples(module, `[I 10]`).map(t => t.get())); 
// console.log("tuples: " + [...module.tuples()].join('\n'));
// sanityCheck(module);
})


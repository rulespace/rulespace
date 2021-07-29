import { compileToModule, sanityCheck, compileModuleTuples } from './test-common.js';

const src = `

(rule [F 0 1])
(rule [F a x] [I n] [F b y] (:= a (+ b 1)) (<= a n) (:= x (* a y)))
(rule [Factorial n x] [I n] [F n x])

`;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {
module.addTuples(compileModuleTuples(module, `[I 10]`));
module.addTuples(compileModuleTuples(module, `[I 5]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log("roots: " + [...module.rootTuples()].join('\n'));
sanityCheck(module);

console.log("\n\n\n");
module.removeTuples(compileModuleTuples(module, `[I 10]`).map(t => t.get())); 
console.log("tuples: " + [...module.tuples()].join('\n'));
sanityCheck(module);
})


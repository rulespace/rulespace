import { compileToModule, sanityCheck, compileModuleTuples } from './test-common.js';

const src = `

(rule [X 0])
(rule [X a] [X b] (< b 5) (:= a (+ b 1)))

`;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {
// module.addTuples(compileModuleTuples(module, ``));
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log("roots: " + [...module.rootTuples()].join('\n'));
sanityCheck(module);

// module.removeTuples(compileModuleTuples(module, `[Link 1 2]`).map(t => t.get())); 
// console.log("tuples: " + [...module.tuples()].join('\n'));
// sanityCheck(module);
})


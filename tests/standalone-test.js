import { compileToModule, sanityCheck } from './test-common.js';

const src = `

(rule [F f] (:= x 123) (:= f (lambda () x)))
(rule [R x] [F f] (:= x (f)))
`;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {

// module.addTuples(compileModuleTuples(module, ``));
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log("roots: " + [...module.rootTuples()].join('\n'));
sanityCheck(module);

// console.log("\n\n\n");
// module.removeTuples(compileModuleTuples(module, `[Link "a" "b"]`).map(t => t.get())); 
// console.log("tuples: " + [...module.tuples()].join('\n'));
// sanityCheck(module);
})


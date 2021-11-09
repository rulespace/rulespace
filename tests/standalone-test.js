import { sexp2rsp } from '../sexp2rsp.js';
import { str2sexp } from '../str2sexp.js';
import { compileToModule, compileModuleTuples } from './test-common.js';
import { instance2dot } from '../utils.js'

const src = `

(rule [R x #:count m] [A x m])
(rule [A 1 1])
(rule [A 1 2])
(rule [A 1 3])
(rule [A 2 2])
(rule [A 2 3])
  `;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {

console.log(`count: ${module.count()}`);

// module.addTuples(compileModuleTuples(module, `[I 'a 10] [I 'a 20] [I 'b 33]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log("roots: " + [...module.rootTuples()].join('\n'));
console.log(`count: ${module.count()}`);

// sanityCheck(module); // reachableTuples is not always equal to members

// console.log("\n\n\n");
// module.removeTuples(compileModuleTuples(module, `[I "def"]`).map(t => t.get())); 
// console.log("tuples: " + [...module.tuples()].join('\n'));
// console.log(`count: ${module.count()}`);

// sanityCheck(module);

console.log(instance2dot(module))
})


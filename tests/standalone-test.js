import { sexp2rsp } from '../sexp2rsp.js';
import { str2sexp } from '../str2sexp.js';
import { compileToModule, compileModuleTuples } from './test-common.js';
import { instance2dot } from '../utils.js'

const src = `

(rule [R a b c d e f g] [I a b c e [S a c d f] a b d g])

  `;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {

console.log(`count: ${module.count()}`);

module.addTuples(compileModuleTuples(module, `[I 1 2 3 5 [S 1 3 4 6] 1 2 4 7]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log("roots: " + [...module.rootTuples()].join('\n'));
console.log(`count: ${module.count()}`);

// sanityCheck(module); // reachableTuples is not always equal to members

console.log("\n\n\n");
module.removeTuples(compileModuleTuples(module, `[I 1 2 3 5 [S 1 3 4 6] 1 2 4 7]`).map(t => t.get())); 
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log(`count: ${module.count()}`);

// sanityCheck(module);

console.log(instance2dot(module))
})


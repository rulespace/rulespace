import { sexp2rsp } from '../sexp2rsp.js';
import { str2sexp } from '../str2sexp.js';
import { compileToModule, compileModuleTuples } from './test-common.js';
import { instance2dot } from '../utils.js'

const src = `

(rule [Reachable x y]
  [Link x y])
  
(rule [Reachable x y]
  [Reachable x z] [Link z y])
  
  
  `;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {

// console.log(`count: ${module.count()}`);

module.addTuples(compileModuleTuples(module, `[Link 1 2] [Link 2 3]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log("roots: " + [...module.rootTuples()].join('\n'));
console.log(`count: ${module.count()}`);

// sanityCheck(module); // reachableTuples is not always equal to members

console.log("\n\n\n");
module.removeTuples(compileModuleTuples(module, `[Link 1 2] [Link 2 3]`).map(t => t.get())); 
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log(`count: ${module.count()}`);

// sanityCheck(module);

// console.log(instance2dot(module))
})


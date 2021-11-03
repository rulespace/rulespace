import { sexp2rsp } from '../sexp2rsp.js';
import { str2sexp } from '../str2sexp.js';
import { compileToModule, compileModuleTuples } from './test-common.js';
import { instance2dot } from '../utils.js'

console.log(sexp2rsp(str2sexp("[Link 'a 'b]")));

const src = `

(rule [O x] [I x])

  `;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {

console.log(`count: ${module.count()}`);

module.addTuples(compileModuleTuples(module, `[I 1]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log("roots: " + [...module.rootTuples()].join('\n'));
console.log(`count: ${module.count()}`);

// sanityCheck(module); // reachableTuples is not always equal to members

console.log("\n\n\n");
module.removeTuples(compileModuleTuples(module, `[I 1]`).map(t => t.get())); 
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log(`count: ${module.count()}`);

// sanityCheck(module);

console.log(instance2dot(module))
})


import { sexp2rsp } from '../sexp2rsp.js';
import { str2sexp } from '../str2sexp.js';
import { compileModuleTuples, compileToModule, sanityCheck } from './test-common.js';

console.log(sexp2rsp(str2sexp("[Link 'a 'b]")));

const src = `

(rule [F not])
(rule [R (f #t)] [F f])

  `;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {

// module.addTuples(compileModuleTuples(module, `[I 'a 10] [I 'a 20] [I 'b 33]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log("roots: " + [...module.rootTuples()].join('\n'));
// sanityCheck(module); // reachableTuples is not always equal to members

// console.log("\n\n\n");
// module.removeTuples(compileModuleTuples(module, `[Link "a" "b"]`).map(t => t.get())); 
// console.log("tuples: " + [...module.tuples()].join('\n'));
// sanityCheck(module);
})


import { sexp2rsp } from '../sexp2rsp.js';
import { str2sexp } from '../str2sexp.js';
import { compileToModule, compileModuleTuples } from './test-common.js';
import { instance2dot } from '../utils.js'

const src = `

(rule [CancellationsToday user today #:count user] [BookingCanceled user today _])

(rule [BookingCanceled "u" 1 1])

(rule [Cancellations #:sum count] [CancellationsToday user today count])

  `;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
// import('./compiled/standalone.mjs').then(module => {

// console.log(`count: ${module.count()}`);

console.log("\n\n\nDELTA add");
module.addTuples(compileModuleTuples(module, `[BookingCanceled "u" 1 2] [BookingCanceled "u" 1 3]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log("roots: " + [...module.rootTuples()].join('\n'));
console.log(`count: ${module.count()}`);

// sanityCheck(module); // reachableTuples is not always equal to members

// console.log("\n\n\nDELTA remove");
// module.removeTuples(compileModuleTuples(module, `[BookingCanceled "u" 1 2] [BookingCanceled "u" 1 1]`).map(t => t.get())); 
// console.log("tuples: " + [...module.tuples()].join('\n'));
// console.log(`count: ${module.count()}`);

// sanityCheck(module);

console.log(instance2dot(module));
})


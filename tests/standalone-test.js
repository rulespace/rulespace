import { sexp2rsp } from '../sexp2rsp.js';
import { str2sexp } from '../str2sexp.js';
import { compileToModule, compileModuleTuples } from './test-common.js';
import { instance2dot } from '../utils.js'

const src = `

(rule [BookingCanceled "u" 1 1])
(rule [BookingCanceled "u" 1 2])
(rule [BookingCanceled "u" 2 1])

(rule [CancellationsToday user today #:count user] [BookingCanceled user today _])

(rule [Cancellations #:sum count] [CancellationsToday user today count])

  `;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
// import('./compiled/standalone.mjs').then(module => {

// console.log(`count: ${module.count()}`);

// console.log("\n\n\nDELTA add");
// const delta1 = module.addTuples(compileModuleTuples(module, `[BookingCanceled "u" 1 3]`));
// console.log("tuples: " + [...module.tuples()].join('\n'));
// console.log("roots: " + [...module.rootTuples()].join('\n'));
// console.log(`count: ${module.count()}`);

// sanityCheck(module); // reachableTuples is not always equal to members

console.log(instance2dot(module));

console.log("\n\n\nDELTA remove");
const delta2 = module.removeTuples(compileModuleTuples(module, `[BookingCanceled "u" 1 2]`).map(t => t.get())); 
console.log("tuples: " + [...module.tuples()].join('\n'));
console.log(`count: ${module.count()}`);

// sanityCheck(module);

// console.log(instance2dot(module));

console.log(`delta2 added ${[...delta2.added().values()].join()}`);
console.log(`delta2 removed ${[...delta2.removed().values()].join()}`);
})


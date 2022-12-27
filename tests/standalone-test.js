import { instance2dot } from '../graph.js';
import { compileToModule, compileModuleTuples } from './test-common.js';

const src = `

(tuple [T x y z])

  `;

compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
// import('./compiled/standalone.mjs').then(module => {

// console.log(`count: ${module.count()}`);

// console.log("\n\n\nDELTA add");
// const delta1 = module.addTuples(compileModuleTuples(module, `[A]`));
// console.log("tuples: " + [...module.tuples()].join('\n'));
// console.log("roots: " + [...module.rootTuples()].join('\n'));
// console.log(`count: ${module.count()}`);

// sanityCheck(module); // reachableTuples is not always equal to members

module.addTuples(compileModuleTuples(module, `[T 1 2 3] [T 4 5 6]`));

console.log(instance2dot(module));

// console.log("\n\n\nDELTA remove");
// const delta2 = module.removeTuples(compileModuleTuples(module, `[A]`).map(t => t.get())); 
// console.log("tuples: " + [...module.tuples()].join('\n'));
// console.log(`count: ${module.count()}`);

// sanityCheck(module);

console.log(instance2dot(module));

// console.log(`delta2 added ${[...delta2.added().values()].join()}`);
// console.log(`delta2 removed ${[...delta2.removed().values()].join()}`);
})


import { compileToModule, sanityCheck, compileModuleTuples } from './test-common.js';

// const src = `

// (rule [B] [A])
// (rule [A] (not [B]))
// `;
const src = `

(rule [R x y z] [I x y x z])

`;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {
module.addTuples(compileModuleTuples(module, `[I 1 2 1 3]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
sanityCheck(module);

// module.removeTuples(compileModuleTuples(module, `[Link 1 2]`).map(t => t.get())); 
// console.log("tuples: " + [...module.tuples()].join('\n'));
// sanityCheck(module);
})


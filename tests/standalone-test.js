import { compileToModule, sanityCheck, compileModuleTuples } from './test-common.js';

// const src = `

// (rule [B] [A])
// (rule [A] (not [B]))
// `;
const src = `

(rule [R x [L [V y 9]]]
  [I x y])

(rule [S a b c]
  [R a [L [V b c]]])

`;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {
module.addTuples(compileModuleTuples(module, `[I 1 2]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
sanityCheck(module);

// module.removeTuples(compileModuleTuples(module, `[Link 1 2]`).map(t => t.get())); 
// console.log("tuples: " + [...module.tuples()].join('\n'));
// sanityCheck(module);
})


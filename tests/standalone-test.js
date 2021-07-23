import { compileToModule, sanityCheck, compileModuleTuples } from './test-common.js';

const src = `

(rule [R a b c d e f g x y z] [H x y z] [I a b c e x [S a c d f y] a b d g z])

`;


compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {
module.addTuples(compileModuleTuples(module, `[H 11 22 33] [I 1 2 3 5 11 [S 1 3 4 6 22] 1 2 4 7 33]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
sanityCheck(module);

// module.removeTuples(compileModuleTuples(module, `[Link 1 2]`).map(t => t.get())); 
// console.log("tuples: " + [...module.tuples()].join('\n'));
// sanityCheck(module);
})


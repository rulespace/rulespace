import { compileToModule, sanityCheck, compileModuleTuples } from './test-common.js';

const src =
`
(rule [X a b] [I a b] (!= a 3))
`;

compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {
module.addTuples(compileModuleTuples(module, `[I 3 4] [I 5 6]`));
console.log("tuples: " + [...module.tuples()].join('\n'));
sanityCheck(module);

// module.removeTuples(compileModuleTuples(module, `[Link 1 2]`).map(t => t.get())); 
// console.log("tuples: " + [...module.tuples()].join('\n'));
// sanityCheck(module);
})


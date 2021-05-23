import { compileToModule, sanityCheck, compileModuleTuples } from './test-common.js';

const src =
`
(rule [Root a] [I a b])
(rule [Lookup x [Root k]] [J x k])
`;

compileToModule(src, 'standalone', {debug:true, assertions:true}).then(module => {
//import('./compiled/standalone.mjs').then(module => {
module.addTuples(compileModuleTuples(module, ``));
console.log("tuples: " + [...module.tuples()].join('\n'));
sanityCheck(module);

// module.removeTuples(compileModuleTuples(module, `[Link 1 2]`).map(t => t.get())); 
// console.log("tuples: " + [...module.tuples()].join('\n'));
// sanityCheck(module);
})


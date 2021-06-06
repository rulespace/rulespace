import { compileToModule, sanityCheck, compileModuleTuples } from './test-common.js';

// const src = `

// (rule [B] [A])
// (rule [A] (not [B]))
// `;
const src = `

(rule [C] [A])
(rule [D] [B])

(rule [E] [A] (not [C]) (not [D]))

(rule [B] [E])
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


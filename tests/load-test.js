import { sexp2rsp } from '../sexp2rsp.js';
import { str2sexp } from '../str2sexp.js';
import { compileToModule, compileModuleTuples } from './test-common.js';
import { instance2dot } from '../utils.js'

const src = `

(rule [Reachable x y]
  [Link x y])
  
(rule [Reachable x y]
  [Reachable x z] [Link z y])

  `;


//compileToModule(src, 'standalone', {debug:false, assertions:false}).then(module => {
import('./compiled/standalone.mjs').then(module => {

console.log(`count: ${module.count()}`);

const start = Date.now();
for (let i = 0; i < 100; i++)
{
  for (let j = 0; j < 100; j++)
  {
    module.addTuples([new module.Link(i, j)]);
  }
}
const end = Date.now();


// console.log("tuples: " + [...module.tuples()].join('\n'));
// console.log("roots: " + [...module.rootTuples()].join('\n'));
console.log(`count: ${module.count()}`);

console.log(`duration ${end-start} ms`);

// sanityCheck(module); // reachableTuples is not always equal to members

// console.log("\n\n\n");
// module.removeTuples(compileModuleTuples(module, `[H 11 22 33] [I 1 2 3 5 11 [S 1 3 4 6 22] 1 2 4 7 33]`).map(t => t.get())); 
// console.log("tuples: " + [...module.tuples()].join('\n'));
// console.log(`count: ${module.count()}`);

// sanityCheck(module);

// console.log(instance2dot(module))
})


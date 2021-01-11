import fs from 'fs';
import { compileToModule, constructTuples } from './test-common.mjs';
import { assertTrue, Sets } from './common.mjs';
import { toDot } from './schemelog-common.mjs';

const src =
`
(define [Reachable x y]
  [Link x y])
  
(define [Reachable x y]
  [Reachable x z] [Link z y])
`;

compileToModule(src, 'standalone', {debug:true}).then(module => {

const edbTuples = constructTuples(module, `[Link "c" "d"] [Link "c" "c"] [Link "b" "c"] [Link "a" "b"]`);
module.add_tuples(edbTuples);
console.log(toDot(module.edbTuples()));
module.remove_tuples([edbTuples[3], edbTuples[2]]);
console.log("tuples: " + [...module.tuples()]);
})

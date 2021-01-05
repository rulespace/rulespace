import fs from 'fs';
import { compileToModule, compileToConstructor } from './test-common.mjs';
import { assertTrue, Sets } from './common.mjs';
import { toDot, constructTuples, toTupleMap } from './schemelog-common.mjs';

const src =
`
(define [Reachable x y]
  [Link x y])
  
(define [Reachable x y]
  [Link x z] [Reachable z y])
`;

//const module = compileToConstructor(src)();

compileToModule(src, 'standalone').then(module => {
module.clear();

// const edbTuples = constructTuples(module, `[I 'a 1] [I 'a 2]`);
// const tupleMap = toTupleMap(edbTuples);

// module.add_tuples(tupleMap);
// console.log("tuples: " + [...module.tuples()]);
// console.log(toDot(module.edbTuples()));
})

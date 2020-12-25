import fs from 'fs';
import { compileToModule } from './test-common.mjs';
import { assertTrue, Sets } from './common.mjs';
import { toDot } from './schemelog-common.mjs';

const src =
`
(define [Rsum x #:sum y]
  [I x y])
`;

compileToModule(src, 'standalone').then(module => {
      module.clear();
      module.add_tuples([
        [module.I, [new module.I('a', 1), new module.I('a', 2)]]
      ]);
      console.log("tuples: " + [...module.tuples()]);
      console.log(toDot(module.edbTuples()));
    })


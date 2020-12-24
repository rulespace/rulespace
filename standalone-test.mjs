import fs from 'fs';
import { compileFile, compile } from './compiler.mjs';
import { assertTrue, Sets } from './common.mjs';
import { toDot } from './schemelog-common.mjs';

const src =
`
(define [Rsum x #:sum y]
  [I x y])
`;

const compiled = compile(src);

fs.writeFileSync(`standalone.mjs`, compiled, 'utf8');
import(`./standalone.mjs`).then(module => {
      module.clear();
      module.add_tuples([
        [module.I, [new module.I('a', 1), new module.I('a', 2)]]
      ]);
      console.log("tuples: " + [...module.tuples()]);
      console.log(toDot(module.edbTuples()));
    })

import(compiled);

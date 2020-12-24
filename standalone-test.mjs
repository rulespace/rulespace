import { compileFile } from './compiler.mjs';
import { assertTrue, Sets } from './common.mjs';
import { toDot } from './schemelog-common.mjs';

function test(fileName, moduleCb)
{
  import(`./${fileName}.mjs`).then(module => {
    module.clear();
    moduleCb(module);
  })
}

compileFile('example5');
test('example5', module => {
  module.clear();
  module.add_tuples([
    [module.I, [new module.I('a', 1), new module.I('a', 2), new module.I('a', 3)]]
  ]);
  console.log("tuples: " + [...module.tuples()]);
  console.log(toDot(module.edbTuples()));
});

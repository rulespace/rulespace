import { compileFile } from './compiler.mjs';
import { assertTrue, Sets } from './common.mjs';

function test(fileName, moduleCb)
{
  import(`./${fileName}.mjs`).then(module => {
    module.clear();
    moduleCb(module);
  })
}

compileFile('example4');
test('example4', module => {
  module.clear();
  module.add_tuples([
    [module.Link, [new module.Link('a', 'b')]]
  ]);
  console.log("tuples: " + [...module.tuples()]);
});

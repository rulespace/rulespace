import { compileFile } from './compiler.mjs';
import { assertTrue, Sets } from './common.mjs';

function test(fileName, moduleCb)
{
  import(`./${fileName}.mjs`).then(module => {
    // module.reset();
    moduleCb(module);
  })
}

compileFile('example1');
test('example1', module => {
  module.clear();
  module.add_tuples([
    [module.Link, [new module.Link('a', 'b'), new module.Link('b', 'c')]]
  ]);
  console.log("tuples: " + [...module.tuples()]);
});

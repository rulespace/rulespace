import { compileFile } from './compiler.mjs';
import { assertTrue, Sets } from './common.mjs';

let testCounter = 0;

function test(fileName, moduleCb)
{
  testCounter++;
  import(`./${fileName}.mjs`).then(moduleCb);
}

compileFile('example1');
test('example1', module => {
  const l_ab = module.link('a', 'b');
  const l_bc = module.link('b', 'c');
  const edbTuples = new Set([l_ab, l_bc]);
  module.addTuples(edbTuples);
  assertTrue(Sets.equals(module.edbTuples(), edbTuples));
  const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c')]);
  const expectedTuples = Sets.union(edbTuples, expectedIdbTuples);
  assertTrue(Sets.equals(module.tuples(), expectedTuples));
  console.log(module.toDot());
});

compileFile('example2');
test('example2', module => {
  const l_ab = module.link('a', 'b');
  const l_bc = module.link('b', 'c');
  const edbTuples = new Set([l_ab, l_bc]);
  module.addTuples(edbTuples);
  assertTrue(Sets.equals(module.edbTuples(), edbTuples));
  const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c')]);
  const expectedTuples = Sets.union(edbTuples, expectedIdbTuples);
  assertTrue(Sets.equals(module.tuples(), expectedTuples));
  // console.log(module.toDot());
});

console.log(`${testCounter} tests`);
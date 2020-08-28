import { compileFile } from './compiler.mjs';
import { assertTrue, Sets } from './common.mjs';

let testCounter = 0;

function test(fileName, moduleCb)
{
  testCounter++;
  import(`./${fileName}.mjs`).then(module => {
    module.reset();
    moduleCb(module);
  })
}

function testInitialSolve(module, edbTuples, expectedIdbTuples, dot)
{
  module.addTuples(edbTuples);
  if (dot) {console.log(module.toDot())};
  assertTrue(Sets.equals(module.edbTuples(), edbTuples));
  const expectedTuples = Sets.union(edbTuples, expectedIdbTuples);
  assertTrue(Sets.equals(module.tuples(), expectedTuples));
}

compileFile('example1'); // reachable: link, reachable
test('example1', module => {
  
  const edbTuples = new Set([ module.link('a', 'b'), module.link('b', 'c')]);
  const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});

compileFile('example2'); // reachable: link, reachable
test('example2', module => {
  const edbTuples = new Set([ module.link('a', 'b'), module.link('b', 'c')]);
  const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});
test('example2', module => {
  const edbTuples = new Set([module.link('a', 'b'), module.link('b', 'c'), module.link('c', 'c')]);
  const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c'), module.reachable('c', 'c')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});
test('example2', module => {
  const edbTuples = new Set([module.link('a', 'b'), module.link('b', 'c'), module.link('c', 'c'), module.link('c', 'd')]);
  const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c'), module.reachable('c', 'c'), module.reachable('c', 'd'), module.reachable('b', 'd'), module.reachable('a', 'd')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});

compileFile('example3'); // reachable: link, reachable; node
test('example3', module => {
  const edbTuples = new Set([ module.link('a', 'b'), module.link('b', 'c')]);
  const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c'),
      module.node('a'), module.node('b'), module.node('c')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});
test('example3', module => {
  const edbTuples = new Set([module.link('a', 'b'), module.link('b', 'c'), module.link('c', 'c')]);
  const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c'), module.reachable('c', 'c'),
      module.node('a'), module.node('b'), module.node('c')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});
test('example3', module => {
  const edbTuples = new Set([module.link('a', 'b'), module.link('b', 'c'), module.link('c', 'c'), module.link('c', 'd')]);
  const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c'), module.reachable('c', 'c'),
      module.reachable('c', 'd'), module.reachable('b', 'd'), module.reachable('a', 'd'),
      module.node('a'), module.node('b'), module.node('c'), module.node('d')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples, true);
});




// test('example2', module => {
//   const edbTuples = new Set([module.link('a', 'b'), module.link('c', 'c'), module.link('c', 'd')]);
//   module.addTuples(edbTuples);
//   const add_wl = [
//     module.link('d', 'e'),
//     module.link('e', 'f'),
//     module.link('f', 'g'),
//     module.link('g', 'h'),
//     module.link('h', 'i'),
//     module.link('m', 'n'),
//     module.link('l', 'm'),
//     module.link('k', 'l'),
//     module.link('j', 'k'),
//     module.link('i', 'j'),
//     module.link('o', 'p'),
//     module.link('q', 'r'),
//     module.link('p', 'q'),
//     module.link('s', 'u'),
//     module.link('s', 't'),
//     module.link('t', 'u'),
//     module.link('v', 'w'),
//     module.link('v', 'x'),
//     module.link('w', 'x'),
//     module.link('y', 'y'),
//     module.link('y', 'x'),
//     module.link('y', 'z'),
//     module.link('z', 'a') ];
//   for (const tuple of add_wl)
//   {
//     module.addTuples([tuple]);
//   }
//   assertTrue(Sets.equals(module.edbTuples(), Sets.union(edbTuples, new Set(add_wl))));
//   // const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c')]);
//   //const expectedTuples = Sets.union(edbTuples, expectedIdbTuples);
//   //assertTrue(Sets.equals(module.tuples(), expectedTuples));
//   // console.log(module.toDot());




console.log(`${testCounter} tests`);
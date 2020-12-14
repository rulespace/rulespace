import { compileFile } from './compiler.mjs';
import { toTupleMap, toDot, sanityCheck } from './schemelog-common.mjs';
import { assertTrue, Sets } from './common.mjs';

let testCounter = 0;

function test(fileName, moduleCb)
{
  testCounter++;
  import(`./${fileName}.mjs`).then(module => {
    module.clear();
    moduleCb(module);
  })
}

function mapGet(tuples)
{
  return new Set([...tuples].flatMap(tuple => tuple.get() === null ? [] : [tuple.get()]));
}

function testInitialSolve(module, edbTuples, expectedIdbTuples, dot)
{
  sanityCheck(module);
  module.add_tuples(toTupleMap(edbTuples)); // edbTuples are always interned
  sanityCheck(module);
  if (dot) {console.log(toDot(edbTuples))}; 
  assertTrue(Sets.equals(new Set(module.edbTuples()), edbTuples));
  const expectedTuples = Sets.union(edbTuples, expectedIdbTuples);
  assertTrue(Sets.equals(new Set(module.tuples()), mapGet(expectedTuples)));
}

function testRemoveEdb(module, edbTuples, removeEdbTuples, dot)
{
  const edbTuples2 = Sets.difference(edbTuples, removeEdbTuples);
  module.addTuples(edbTuples2);
  const expectedTuples = module.tuples();

  module.addTuples(removeEdbTuples);
  module.removeTuples(removeEdbTuples);
  assertTrue(Sets.equals(module.tuples(), expectedTuples));
}

compileFile('example1'); // reachable: link, reachable
test('example1', module => {
  const edbTuples = new Set([new module.Link('a','b'), new module.Link('b','c')]);
  const expectedIdbTuples = new Set([new module.Reachable('a', 'b'), new module.Reachable('b', 'c'), new module.Reachable('a', 'c')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples, true);
});
// test('example1', module => {
  
//   const edbTuples = new Set([ module.link('a', 'b'), module.link('b', 'c')]);
//   const removeEdbTuples = new Set([module.link('b', 'c')]);
//   testRemoveEdb(module, edbTuples, removeEdbTuples);
// });

// compileFile('example2'); // reachable: link, reachable
// test('example2', module => {
//   const edbTuples = new Set([ module.link('a', 'b'), module.link('b', 'c')]);
//   const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c')]);
//   testInitialSolve(module, edbTuples, expectedIdbTuples);
// });
// test('example2', module => {
//   const edbTuples = new Set([module.link('a', 'b'), module.link('b', 'c'), module.link('c', 'c')]);
//   const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c'), module.reachable('c', 'c')]);
//   testInitialSolve(module, edbTuples, expectedIdbTuples);
// });
// test('example2', module => {
//   const edbTuples = new Set([module.link('a', 'b'), module.link('b', 'c'), module.link('c', 'c'), module.link('c', 'd')]);
//   const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c'), module.reachable('c', 'c'), module.reachable('c', 'd'), module.reachable('b', 'd'), module.reachable('a', 'd')]);
//   testInitialSolve(module, edbTuples, expectedIdbTuples);
// });

// compileFile('example3'); // reachable: link, reachable; node
// test('example3', module => {
//   const edbTuples = new Set([ module.link('a', 'b'), module.link('b', 'c')]);
//   const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c'),
//       module.node('a'), module.node('b'), module.node('c')]);
//   testInitialSolve(module, edbTuples, expectedIdbTuples);
// });
// test('example3', module => {
//   const edbTuples = new Set([module.link('a', 'b'), module.link('b', 'c'), module.link('c', 'c')]);
//   const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c'), module.reachable('c', 'c'),
//       module.node('a'), module.node('b'), module.node('c')]);
//   testInitialSolve(module, edbTuples, expectedIdbTuples);
// });
// test('example3', module => {
//   const edbTuples = new Set([module.link('a', 'b'), module.link('b', 'c'), module.link('c', 'c'), module.link('c', 'd')]);
//   const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c'), module.reachable('c', 'c'),
//       module.reachable('c', 'd'), module.reachable('b', 'd'), module.reachable('a', 'd'),
//       module.node('a'), module.node('b'), module.node('c'), module.node('d')]);
//   testInitialSolve(module, edbTuples, expectedIdbTuples);
// });

// compileFile('example4'); // reachable: link, reachable; node; unreachable
// test('example4', module => {
//   const edbTuples = new Set([module.link('a', 'b'), module.link('b', 'c')]);
//   const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c'),
//       module.node('a'), module.node('b'), module.node('c'), 
//       module.unreachable('a', 'a'), module.unreachable('b', 'a'), module.unreachable('b', 'b'), module.unreachable('c', 'a'), module.unreachable('c', 'b'), module.unreachable('c', 'c')]);
//   testInitialSolve(module, edbTuples, expectedIdbTuples);
// });
// test('example4', module => {
//   const edbTuples = new Set([module.link('a', 'b'), module.link('b', 'c'), module.link('c', 'c')]);
//   const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c'), module.reachable('c', 'c'),
//       module.node('a'), module.node('b'), module.node('c'), 
//       module.unreachable('a', 'a'), module.unreachable('b', 'a'), module.unreachable('b', 'b'), module.unreachable('c', 'a'), module.unreachable('c', 'b')]);
//   testInitialSolve(module, edbTuples, expectedIdbTuples);
// });
// test('example4', module => {
//   const edbTuples = new Set([module.link('a', 'b'), module.link('b', 'c'), module.link('c', 'c'), module.link('c', 'd')]);
//   const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c'), module.reachable('c', 'c'), 
//       module.reachable('c', 'd'), module.reachable('b', 'd'), module.reachable('a', 'd'),
//       module.node('a'), module.node('b'), module.node('c'), module.node('d'),
//       module.unreachable('a', 'a'), module.unreachable('b', 'a'), module.unreachable('b', 'b'), module.unreachable('c', 'a'), module.unreachable('c', 'b'),
//       module.unreachable('d', 'd'), module.unreachable('d', 'c'), module.unreachable('d', 'b'), module.unreachable('d', 'a')]);
//   testInitialSolve(module, edbTuples, expectedIdbTuples);
// });
// test('example4', module => {
//   const edbTuples = new Set([module.link('a', 'b'), module.link('b', 'c'), module.link('c', 'c'), module.link('c', 'd'), module.link('c', 'b')]);
//   const expectedIdbTuples = new Set([module.reachable('a', 'b'), module.reachable('b', 'c'), module.reachable('a', 'c'), module.reachable('c', 'c'), 
//       module.reachable('c', 'd'), module.reachable('b', 'd'), module.reachable('a', 'd'), module.reachable('c', 'b'), module.reachable('b', 'b'),
//       module.node('a'), module.node('b'), module.node('c'), module.node('d'),
//       module.unreachable('a', 'a'), module.unreachable('b', 'a'), module.unreachable('c', 'a'),
//       module.unreachable('d', 'd'), module.unreachable('d', 'c'), module.unreachable('d', 'b'), module.unreachable('d', 'a')]);
//   testInitialSolve(module, edbTuples, expectedIdbTuples);
// });

// compileFile('example5'); // rmax, rmin, rcount, rsum
// test('example5', module => {
//   const edbTuples = new Set([module.i('a', 10), module.i('a', 20), module.i('b', 33)]);
//   const expectedIdbTuples = new Set([
//     module.rsum('a', 30), module.rsum('b', 33),
//     module.rmax('a', 20), module.rmax('b', 33),
//     module.rmin('a', 10), module.rmin('b', 33),
//     module.rcount('a', 2), module.rcount('b', 1),
//   ]);
//   testInitialSolve(module, edbTuples, expectedIdbTuples);
// });


console.log(`${testCounter} tests`);
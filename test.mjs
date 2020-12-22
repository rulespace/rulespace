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
  module.add_tuples(toTupleMap(edbTuples));
  if (dot) {console.log(toDot(module.edbTuples()))}; 
  sanityCheck(module);
  assertTrue(Sets.equals(new Set(module.edbTuples()), edbTuples));
  expectedIdbTuples = mapGet(expectedIdbTuples);
  const expectedTuples = Sets.union(edbTuples, expectedIdbTuples);
  assertTrue(Sets.equals(new Set(module.tuples()), expectedTuples));
}

function testRemoveEdb(module, edbTuples, removeEdbTuples, dot)
{
  edbTuples = mapGet(edbTuples);
  removeEdbTuples = mapGet(removeEdbTuples);
  const edbTuples2 = Sets.difference(edbTuples, removeEdbTuples);
  sanityCheck(module);
  module.add_tuples(edbTuples2);
  sanityCheck(module);
  const expectedTuples = module.tuples();

  module.add_tuples(removeEdbTuples);
  sanityCheck(module);
  module.remove_tuples(removeEdbTuples);
  if (dot) {console.log(toDot(module.edbTuples()))}; 
  sanityCheck(module);
  assertTrue(Sets.equals(module.tuples(), expectedTuples));
}

compileFile('example1'); // reachable: link, reachable
test('example1', module => {
  const edbTuples = new Set([new module.Link('a','b'), new module.Link('b','c')]);
  const expectedIdbTuples = new Set([new module.Reachable('a', 'b'), new module.Reachable('b', 'c'), new module.Reachable('a', 'c')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});
test('example1', module => {  
  const edbTuples = new Set([new module.Link('a', 'b'), new module.Link('b', 'c')]);
  const removeEdbTuples = new Set([new module.Link('b', 'c')]);
  testRemoveEdb(module, edbTuples, removeEdbTuples);
});

compileFile('example2'); // reachable: link, reachable
test('example2', module => {
  const edbTuples = new Set([new module.Link('a', 'b'), new module.Link('b', 'c')]);
  const expectedIdbTuples = new Set([new module.Reachable('a', 'b'), new module.Reachable('b', 'c'), new module.Reachable('a', 'c')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});
test('example2', module => {
  const edbTuples = new Set([new module.Link('a', 'b'), new module.Link('b', 'c'), new module.Link('c', 'c')]);
  const expectedIdbTuples = new Set([new module.Reachable('a', 'b'), new module.Reachable('b', 'c'), new module.Reachable('a', 'c'), new module.Reachable('c', 'c')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});
test('example2', module => {
  const edbTuples = new Set([new module.Link('a', 'b'), new module.Link('b', 'c'), new module.Link('c', 'c'), new module.Link('c', 'd')]);
  const expectedIdbTuples = new Set([new module.Reachable('a', 'b'), new module.Reachable('b', 'c'), new module.Reachable('a', 'c'), new module.Reachable('c', 'c'), new module.Reachable('c', 'd'), new module.Reachable('b', 'd'), new module.Reachable('a', 'd')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});

compileFile('example3'); // reachable: link, reachable; node
test('example3', module => {
  const edbTuples = new Set([new module.Link('a', 'b'), new module.Link('b', 'c')]);
  const expectedIdbTuples = new Set([new module.Reachable('a', 'b'), new module.Reachable('b', 'c'), new module.Reachable('a', 'c'),
      new module.Node('a'), new module.Node('b'), new module.Node('c')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});
test('example3', module => {
  const edbTuples = new Set([new module.Link('a', 'b'), new module.Link('b', 'c'), new module.Link('c', 'c')]);
  const expectedIdbTuples = new Set([new module.Reachable('a', 'b'), new module.Reachable('b', 'c'), new module.Reachable('a', 'c'), new module.Reachable('c', 'c'),
      new module.Node('a'), new module.Node('b'), new module.Node('c')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});
test('example3', module => {
  const edbTuples = new Set([new module.Link('a', 'b'), new module.Link('b', 'c'), new module.Link('c', 'c'), new module.Link('c', 'd')]);
  const expectedIdbTuples = new Set([new module.Reachable('a', 'b'), new module.Reachable('b', 'c'), new module.Reachable('a', 'c'), new module.Reachable('c', 'c'),
      new module.Reachable('c', 'd'), new module.Reachable('b', 'd'), new module.Reachable('a', 'd'),
      new module.Node('a'), new module.Node('b'), new module.Node('c'), new module.Node('d')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});

compileFile('example4'); // reachable: link, reachable; node; unreachable
test('example4', module => {
  const edbTuples = new Set([new module.Link('a', 'b'), new module.Link('b', 'c')]);
  const expectedIdbTuples = new Set([new module.Reachable('a', 'b'), new module.Reachable('b', 'c'), new module.Reachable('a', 'c'),
      new module.Node('a'), new module.Node('b'), new module.Node('c'), 
      new module.Unreachable('a', 'a'), new module.Unreachable('b', 'a'), new module.Unreachable('b', 'b'), new module.Unreachable('c', 'a'), new module.Unreachable('c', 'b'), new module.Unreachable('c', 'c')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});
test('example4', module => {
  const edbTuples = new Set([new module.Link('a', 'b'), new module.Link('b', 'c'), new module.Link('c', 'c')]);
  const expectedIdbTuples = new Set([new module.Reachable('a', 'b'), new module.Reachable('b', 'c'), new module.Reachable('a', 'c'), new module.Reachable('c', 'c'),
      new module.Node('a'), new module.Node('b'), new module.Node('c'), 
      new module.Unreachable('a', 'a'), new module.Unreachable('b', 'a'), new module.Unreachable('b', 'b'), new module.Unreachable('c', 'a'), new module.Unreachable('c', 'b')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});
test('example4', module => {
  const edbTuples = new Set([new module.Link('a', 'b'), new module.Link('b', 'c'), new module.Link('c', 'c'), new module.Link('c', 'd')]);
  const expectedIdbTuples = new Set([new module.Reachable('a', 'b'), new module.Reachable('b', 'c'), new module.Reachable('a', 'c'), new module.Reachable('c', 'c'), 
      new module.Reachable('c', 'd'), new module.Reachable('b', 'd'), new module.Reachable('a', 'd'),
      new module.Node('a'), new module.Node('b'), new module.Node('c'), new module.Node('d'),
      new module.Unreachable('a', 'a'), new module.Unreachable('b', 'a'), new module.Unreachable('b', 'b'), new module.Unreachable('c', 'a'), new module.Unreachable('c', 'b'),
      new module.Unreachable('d', 'd'), new module.Unreachable('d', 'c'), new module.Unreachable('d', 'b'), new module.Unreachable('d', 'a')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});
test('example4', module => {
  const edbTuples = new Set([new module.Link('a', 'b'), new module.Link('b', 'c'), new module.Link('c', 'c'), new module.Link('c', 'd'), new module.Link('c', 'b')]);
  const expectedIdbTuples = new Set([new module.Reachable('a', 'b'), new module.Reachable('b', 'c'), new module.Reachable('a', 'c'), new module.Reachable('c', 'c'), 
      new module.Reachable('c', 'd'), new module.Reachable('b', 'd'), new module.Reachable('a', 'd'), new module.Reachable('c', 'b'), new module.Reachable('b', 'b'),
      new module.Node('a'), new module.Node('b'), new module.Node('c'), new module.Node('d'),
      new module.Unreachable('a', 'a'), new module.Unreachable('b', 'a'), new module.Unreachable('c', 'a'),
      new module.Unreachable('d', 'd'), new module.Unreachable('d', 'c'), new module.Unreachable('d', 'b'), new module.Unreachable('d', 'a')]);
  testInitialSolve(module, edbTuples, expectedIdbTuples);
});

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
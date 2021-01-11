import { assertTrue, Sets } from './common.mjs';
import { compileToConstructor, constructTuples, Unique } from './test-common.mjs';
import { toDot, sanityCheck } from './schemelog-common.mjs';

function getModuleTuples(tuples)
{
  return new Set([...tuples].flatMap(tuple => tuple.get() === null ? [] : [tuple.get()]));
}

function testInitialSolve(src, edbTuplesSrc, expectedIdbTuplesSrc, dot)
{
  const unique = new Unique();
  const module = compileToConstructor(src)();
  sanityCheck(module);
  const edbTuples = unique.set(constructTuples(module, edbTuplesSrc)); 
  module.add_tuples(edbTuples);
  if (dot) {console.log(toDot(module.edbTuples()))}; 
  sanityCheck(module);
  assertTrue(Sets.equals(unique.set(module.edbTuples()), edbTuples));
  const expectedIdbTuples = unique.set(constructTuples(module, expectedIdbTuplesSrc));
  const expectedTuples = Sets.union(edbTuples, expectedIdbTuples);
  assertTrue(Sets.equals(unique.set(module.tuples()), expectedTuples));
}

function testIncrementalAdd(src, edbTuplesSrc, dot)
{
  const unique = new Unique();
  const ctr = compileToConstructor(src);
  const nimodule = ctr();
  sanityCheck(nimodule);
  const niEdbTuples = constructTuples(nimodule, edbTuplesSrc); 
  nimodule.add_tuples(niEdbTuples);
  sanityCheck(nimodule);
  
  const imodule = ctr();
  sanityCheck(imodule);
  const iEdbTuples = constructTuples(imodule, edbTuplesSrc); 
  for (const t of iEdbTuples)
  {
    imodule.add_tuples([t]);
    sanityCheck(imodule);
  }
  if (dot)
  {
    console.log("ni");
    console.log(toDot(nimodule.edbTuples()))
    console.log("i");
    console.log(toDot(imodule.edbTuples()))
  }; 
  assertTrue(Sets.equals(unique.set(nimodule.tuples()), unique.set(imodule.tuples())));
}

function testRemoveEdb(src, edbTuplesSrc, removeEdbTuplesSrc, dot)
{
  const unique = new Unique();
  const module = compileToConstructor(src)();
  sanityCheck(module);
  const edbTuples = unique.set(constructTuples(module, edbTuplesSrc));
  const removeEdbTuples = unique.set(constructTuples(module, removeEdbTuplesSrc));
  const edbTuples2 = Sets.difference(edbTuples, removeEdbTuples);

  module.add_tuples(edbTuples2);
  sanityCheck(module);
  const expectedTuples = unique.set(module.tuples());
  if (dot) {console.log(toDot(module.edbTuples()))}; 

  module.add_tuples(removeEdbTuples);
  sanityCheck(module);
  module.remove_tuples(getModuleTuples(removeEdbTuples));
  if (dot) {console.log(toDot(module.edbTuples()))}; 
  sanityCheck(module);
  assertTrue(Sets.equals(unique.set(module.tuples()), expectedTuples));
}

const example1 = `
(define [Reachable x y]
  [Link x y])
  
(define [Reachable x y]
  [Reachable x z] [Link z y])
`;
 
testInitialSolve(example1, `[Link 'a 'b] [Link 'b 'c]`, 
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]`);
testInitialSolve(example1, `[Link 'b 'c] [Link 'a 'b]`, 
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]`);
testInitialSolve(example1, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]`);
testInitialSolve(example1, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c] [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd]`);

testIncrementalAdd(example1, `[Link 'a 'b] [Link 'b 'c]`);
testIncrementalAdd(example1, `[Link 'b 'c] [Link 'a 'b]`);
testIncrementalAdd(example1, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`);
testIncrementalAdd(example1, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b]`);

testRemoveEdb(example1, `[Link 'a 'b] [Link 'b 'c]`, `[Link 'a 'b]`);
testRemoveEdb(example1, `[Link 'a 'b] [Link 'b 'c]`, `[Link 'b 'c]`);
testRemoveEdb(example1, `[Link 'a 'b] [Link 'b 'c]`, `[Link 'a 'b] [Link 'b 'c]`);
testRemoveEdb(example1, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b]`, `[Link 'a 'b] [Link 'b 'c]`);
testRemoveEdb(example1, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b]`, `[Link 'c 'c]`);

const example2 = `
(define [Reachable x y]
  [Link x y])
  
(define [Reachable x y]
  [Link x z] [Reachable z y])
`;

testInitialSolve(example2, `[Link 'a 'b] [Link 'b 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]`);
testInitialSolve(example2, `[Link 'b 'c] [Link 'a 'b]`, 
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]`);
testInitialSolve(example2, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]`);
testInitialSolve(example2, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c] [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd]`);

testIncrementalAdd(example2, `[Link 'b 'c] [Link 'a 'b]`);
testIncrementalAdd(example2, `[Link 'b 'c] [Link 'a 'b]`);
testIncrementalAdd(example2, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`);
testIncrementalAdd(example2, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b]`);

testRemoveEdb(example2, `[Link 'a 'b] [Link 'b 'c]`, `[Link 'a 'b]`);
testRemoveEdb(example2, `[Link 'a 'b] [Link 'b 'c]`, `[Link 'b 'c]`);
testRemoveEdb(example2, `[Link 'a 'b] [Link 'b 'c]`, `[Link 'a 'b] [Link 'b 'c]`);
testRemoveEdb(example2, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b]`, `[Link 'a 'b] [Link 'b 'c]`);
testRemoveEdb(example2, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b]`, `[Link 'c 'c]`);

const example3 = `
(define [Reachable x y]
  [Link x y])
  
(define [Reachable x y]
  [Link x z] [Reachable z y])

(define [Node x]
  [Link x _])
  
(define [Node y]
  [Link _ y])
`;

testInitialSolve(example3, `[Link 'a 'b] [Link 'b 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]
   [Node 'a] [Node 'b] [Node 'c]`);

testInitialSolve(example3, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]
   [Node 'a] [Node 'b] [Node 'c]`);

testInitialSolve(example3, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c] [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd]
   [Node 'a] [Node 'b] [Node 'c] [Node 'd]`);


const example4 = `
(define [Reachable x y]
  [Link x y])
  
(define [Reachable x y]
  [Link x z] [Reachable z y])

(define [Node x]
  [Link x _])
  
(define [Node y]
  [Link _ y])

(define [Unreachable x y]
  [Node x] [Node y] (not [Reachable x y]))
`;

testInitialSolve(example4, `[Link 'a 'b] [Link 'b 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]
   [Node 'a] [Node 'b] [Node 'c]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'b 'b]
   [Unreachable 'c 'a] [Unreachable 'c 'b] [Unreachable 'c 'c]`);

testInitialSolve(example4, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]
   [Node 'a] [Node 'b] [Node 'c]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'b 'b]
   [Unreachable 'c 'a] [Unreachable 'c 'b]`);
  
testInitialSolve(example4, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]
   [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd]
   [Node 'a] [Node 'b] [Node 'c] [Node 'd]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'b 'b]
   [Unreachable 'c 'a] [Unreachable 'c 'b]
   [Unreachable 'd 'd] [Unreachable 'd 'c] [Unreachable 'd 'b] [Unreachable 'd 'a]`);
      
testInitialSolve(example4, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd] [Link 'c 'b]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]
   [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd] [Reachable 'c 'b] [Reachable 'b 'b]
   [Node 'a] [Node 'b] [Node 'c] [Node 'd]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'c 'a]
   [Unreachable 'd 'd] [Unreachable 'd 'c] [Unreachable 'd 'b] [Unreachable 'd 'a]`);

   
const example5 = `
(define [Rsum x #:sum y]
  [I x y])

(define [Rmax x #:max y]
  [I x y])
  
(define [Rmin x #:min y]
  [I x y])
      
(define [Rcount x #:count y]
  [I x y])
`;

testInitialSolve(example5, `[I 'a 10] [I 'a 20] [I 'b 33]`,
  `[Rsum 'a 30] [Rsum 'b 33]
   [Rmax 'a 20] [Rmax 'b 33]
   [Rmin 'a 10] [Rmin 'b 33]
   [Rcount 'a 2] [Rcount 'b 1]
  `);


const example6 = `
(define [B x] [A x])
(define [C x] [B x])
(define [E x] [D x])
(define [C x] [E x])
`;

testInitialSolve(example6, `[A 1] [A 2] [D 3] [D 4]`,
  `[B 1] [B 2] [C 1] [C 2]
   [E 3] [E 4] [C 3] [C 4]
  `);

testInitialSolve(example6, `[A 1] [A 2] [A 3] [A 4] [D 1] [D 2] [D 3] [D 4]`,
  `[B 1] [B 2] [B 3] [B 4]
   [E 1] [E 2] [E 3] [E 4]
   [C 1] [C 2] [C 3] [C 4]
  `);

testRemoveEdb(example6, `[A 1] [A 2] [A 3] [A 4] [D 1] [D 2] [D 3] [D 4]`, `[A 1]`);
testRemoveEdb(example6, `[A 1] [A 2] [A 3] [A 4] [D 1] [D 2] [D 3] [D 4]`, `[D 1]`);
testRemoveEdb(example6, `[A 1] [A 2] [A 3] [A 4] [D 1] [D 2] [D 3] [D 4]`, `[A 1] [D 1]`);

console.log("done");
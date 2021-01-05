import { compileToConstructor, compileToModule } from './test-common.mjs';
import { toTupleMap, toDot, sanityCheck, constructTuples } from './schemelog-common.mjs';
import { assertTrue, Sets } from './common.mjs';


function mapGet(tuples)
{
  return new Set([...tuples].flatMap(tuple => tuple.get() === null ? [] : [tuple.get()]));
}

function testInitialSolve(src, edbTuplesSrc, expectedIdbTuplesSrc, dot)
{
  const module = compileToConstructor(src)();
  sanityCheck(module);
  const edbTuples = new Set(constructTuples(module, edbTuplesSrc));
  module.add_tuples(toTupleMap(edbTuples));
  if (dot) {console.log(toDot(module.edbTuples()))}; 
  sanityCheck(module);
  assertTrue(Sets.equals(new Set(module.edbTuples()), edbTuples));
  const expectedIdbTuples = mapGet(constructTuples(module, expectedIdbTuplesSrc));
  const expectedTuples = Sets.union(edbTuples, expectedIdbTuples);
  assertTrue(Sets.equals(new Set(module.tuples()), expectedTuples));
}

function testRemoveEdb(src, edbTuplesSrc, removeEdbTuplesSrc, dot)
{
  const module = compileToConstructor(src)();
  sanityCheck(module);
  const edbTuples = new Set(constructTuples(module, edbTuplesSrc));
  const removeEdbTuples = mapGet(constructTuples(module, removeEdbTuplesSrc));
  const edbTuples2 = Sets.difference(edbTuples, removeEdbTuples);

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

const example1 = `
(define [Reachable x y]
  [Link x y])
  
(define [Reachable x y]
  [Reachable x z] [Link z y])
`;
 
testInitialSolve(example1, `[Link 'a 'b] [Link 'b 'c]`, 
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]`);
testRemoveEdb(example1, `[Link 'a 'b] [Link 'b 'c]`, `[Link 'b 'c]`);


const example2 = `
(define [Reachable x y]
  [Link x y])
  
(define [Reachable x y]
  [Link x z] [Reachable z y])
`;

testInitialSolve(example2, `[Link 'a 'b] [Link 'b 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]`);

testInitialSolve(example2, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]`);

testInitialSolve(example2, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c] [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd]`);

  
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


console.log("done");
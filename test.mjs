import { assertTrue, Sets } from './common.mjs';
import { compileToConstructor, parseTuples, Unique, toModuleTupleFor, toGenericTuple } from './test-common.mjs';
import { toDot, sanityCheck } from './schemelog-common.mjs';

function getModuleTuples(tuples)
{
  return new Set([...tuples].flatMap(tuple => tuple.get() === null ? [] : [tuple.get()]));
}

function permutations(s)
{
  if (s.length === 0)
  {
    return [[]];
  }
  return s.flatMap(x => permutations(remove(x, s)).map(p => [x, ...p]));
}

function selections(tuples)
{
  const result = [];
  for (let i=0; i<tuples.length; i++)
  {
    for (let j=i+1; j<=tuples.length; j++)
    {
      result.push(tuples.slice(i, j));
    }
  }
  return result;
}

// function combinations(tuples, comb=[], result=[comb])
// {
//   for (let i=0; i<tuples.length; i++)
//   {
//     result = result.concat(combinations(tuples.slice(0,i).concat(tuples.slice(i+1)), comb.concat(tuples[i])));
//   }
//   return result;
// }

function remove(item, seq)
{
  return [...seq].filter(x => x !== item);
}

function testInitialSolve(src, edbTuplesSrc, expectedIdbTuplesSrc)
{
  const unique = new Unique();
  const ctr = compileToConstructor(src);
  const edbTuples = parseTuples(edbTuplesSrc);
  const expectedIdbTuples = parseTuples(expectedIdbTuplesSrc);
  for (const p of permutations(edbTuples))
  {
    const module = ctr();
    sanityCheck(module);
    module.add_tuples(p.map(toModuleTupleFor(module)));  
    sanityCheck(module);
    assertTrue(Sets.equals(unique.set(module.edbTuples()), unique.set(p)));
    const expectedTuples = Sets.union(unique.set(p), unique.set(expectedIdbTuples));
    assertTrue(Sets.equals(unique.set(module.tuples()), expectedTuples));
  }
  // if (dot) {console.log(toDot(module.edbTuples()))}; 
}

function testIncrementalAdd(src, edbTuplesSrc)
{
  const unique = new Unique();
  const ctr = compileToConstructor(src);
  const edbTuples = parseTuples(edbTuplesSrc);

  for (const s of selections(edbTuples))
  {
    const nimodule = ctr();
    nimodule.add_tuples(s.map(toModuleTupleFor(nimodule)));
    sanityCheck(nimodule);
  
    for (const p of permutations(s))
    {
      const imodule = ctr();
      for (const t of p)
      {
        imodule.add_tuples([t].map(toModuleTupleFor(imodule)));
        sanityCheck(imodule);
      }
      assertTrue(Sets.equals(unique.set(nimodule.tuples()), unique.set(imodule.tuples())));  
    }
  }
}

function testRemoveEdb(src, edbTuplesSrc)
{
  const unique = new Unique();
  const ctr = compileToConstructor(src);
  const edbTuples = parseTuples(edbTuplesSrc);
  
  for (const s of selections(edbTuples))
  {
    const remainingEdbs = Sets.difference(unique.set(edbTuples), unique.set(s));
    const nimodule = ctr();
    nimodule.add_tuples([...remainingEdbs].map(toModuleTupleFor(nimodule)));
    sanityCheck(nimodule);

    const imodule = ctr();
    imodule.add_tuples([...edbTuples].map(toModuleTupleFor(imodule)));
    sanityCheck(imodule);
    imodule.remove_tuples([...s].map(toModuleTupleFor(imodule)).map(t => t.get()));
    sanityCheck(imodule);

    if (!Sets.equals(unique.set(nimodule.tuples()), unique.set(imodule.tuples())))
    {
      console.log("edbTuples: " + edbTuples.join());
      console.log("selection: " + s.join());
      console.log("remaining  " + [...remainingEdbs].join());
      console.log("ni tuples: " + [...nimodule.tuples()]);
      console.log("i tuples:  " + [...imodule.tuples()]);
      throw new Error("assertion failed");
    }
  }
}

const example1 = `
(define [Reachable x y]
  [Link x y])
  
(define [Reachable x y]
  [Reachable x z] [Link z y])
`;
 
testInitialSolve(example1, `[Link 'a 'b] [Link 'b 'c]`, 
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]`);
testInitialSolve(example1, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]`);
testInitialSolve(example1, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c] [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd]`);

testIncrementalAdd(example1, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`);

testRemoveEdb(example1, `[Link 'a 'b] [Link 'b 'c]`);
testRemoveEdb(example1, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b]`);

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

testIncrementalAdd(example2, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`);

testRemoveEdb(example2, `[Link 'a 'b] [Link 'b 'c]`, `[Link 'a 'b]`);
testRemoveEdb(example2, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b]`);

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

testIncrementalAdd(example6, `[A 1] [A 2] [A 3] [A 4] [D 1] [D 2] [D 3] [D 4]`);

testRemoveEdb(example6, `[A 1] [A 2] [A 3] [A 4] [D 1] [D 2] [D 3] [D 4]`);

console.log("done");
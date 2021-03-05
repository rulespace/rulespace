import { performance } from 'perf_hooks';
import { assertTrue, Sets } from 'common';
import { compileToConstructor, parseTuples, tupleEquals } from './test-common.js';
import { toDot, sanityCheck } from '../schemelog-common.js';

function containsTuple(t, ts)
{
  for (const tt of ts)
  {
    if (tupleEquals(t, tt))
    {
      return true;
    }
  }
  return false;
}

function equalTuples(ts1, ts2)
{
  const as1 = [...ts1];
  const as2 = [...ts2];
  if (as1.length !== as2.length)
  {
    return false;
  }
  for (const t1 of as1)
  {
    if (!containsTuple(t1, as2))
    {
      return false;
    }
  }
  return true;
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
  const ctr = compileToConstructor(src);
  const edbTuples = parseTuples(edbTuplesSrc);
  const expectedIdbTuples = parseTuples(expectedIdbTuplesSrc);
  for (const p of permutations(edbTuples))
  {
    const module = ctr();
    sanityCheck(module);
    const delta = module.addTuples(p);
    sanityCheck(module);
    // const expectedEdbTuples = new  // TODO: by design, added non-edb tuples are discarded by module
    // if (!equalTuples(module.edbTuples(), p))
    // {
    //   console.log("(expected) edb tuples: " + [...p].join());
    //   console.log("module edb tuples: " + [...module.edbTuples()].join());
    //   throw new Error("assertion failed");
    // }
    const expectedTuples = Sets.union(module.edbTuples(), expectedIdbTuples); // here, use 'actual' module edb tuples 
    assertTrue(equalTuples(module.tuples(), expectedTuples));
    assertTrue(equalTuples([...delta.added().values()].flat(), expectedTuples));
  }
  // if (dot) {console.log(toDot(module.edbTuples()))}; 
}

function testIncrementalAdd(src, edbTuplesSrc)
{
  const ctr = compileToConstructor(src);
  const edbTuples = parseTuples(edbTuplesSrc);

  for (const s of selections(edbTuples))
  {
    const nimodule = ctr();
    nimodule.addTuples(s);
    sanityCheck(nimodule);
  
    let imodule;

    for (const p of permutations(s))
    {
      try
      {
        imodule = ctr();
        for (const t of p)
        {
          imodule.addTuples([t]);
          sanityCheck(imodule);
        }

        assertTrue(equalTuples(nimodule.tuples(), imodule.tuples()));
      }
      catch (e)
      {
        console.log("permutation: " + p.join());
        console.log("ni tuples: " + [...nimodule.tuples()]);
        console.log("i tuples:  " + [...imodule.tuples()]);
        throw e;
      }
    }
  }
}

function testRemoveEdb(src, edbTuplesSrc)
{
  const ctr = compileToConstructor(src);
  const edbTuples = parseTuples(edbTuplesSrc);
  
  for (const s of selections(edbTuples))
  {
    let remainingEdbs;
    let nimodule, imodule;
    try
    {
      remainingEdbs = Sets.difference(edbTuples, s);
      nimodule = ctr();
      nimodule.addTuples([...remainingEdbs]);
      sanityCheck(nimodule);
  
      imodule = ctr();
      imodule.addTuples([...edbTuples]);
      sanityCheck(imodule);
      imodule.removeTuples([...s]);
      sanityCheck(imodule);
  
      assertTrue(equalTuples(nimodule.tuples(), imodule.tuples()));
    }
    catch (e)
    {
      console.log("edbTuples: " + edbTuples.join());
      console.log("selection: " + s.join());
      console.log("remaining  " + [...remainingEdbs].join());
      console.log("ni tuples: " + [...nimodule.tuples()]);
      console.log("i tuples:  " + [...imodule.tuples()]);
      throw e;
    }
  }
}

const start = performance.now();

const example1 = `
(rule [Reachable x y]
  [Link x y])
  
(rule [Reachable x y]
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

testRemoveEdb(example1, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b] [Link 'c 'b]`);

const example2 = `
(rule [Reachable x y]
  [Link x y])
  
(rule [Reachable x y]
  [Link x z] [Reachable z y])
`;

testInitialSolve(example2, `[Link 'a 'b] [Link 'b 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]`);
testInitialSolve(example2, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]`);
testInitialSolve(example2, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c] [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd]`);

testIncrementalAdd(example2, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`);

testRemoveEdb(example2, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b] [Link 'c 'b]`);

const example3 = `
(rule [Reachable x y]
  [Link x y])
  
(rule [Reachable x y]
  [Link x z] [Reachable z y])

(rule [Node x]
  [Link x _])
  
(rule [Node y]
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

testIncrementalAdd(example3, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`);

testRemoveEdb(example3, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b] [Link 'c 'b]`);
   

const example4 = `
(rule [Reachable x y]
  [Link x y])
  
(rule [Reachable x y]
  [Link x z] [Reachable z y])

(rule [Node x]
  [Link x _])
  
(rule [Node y]
  [Link _ y])

(rule [Unreachable x y]
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

 
testIncrementalAdd(example4, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd] [Link 'c 'b]`);

testRemoveEdb(example4, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b] [Link 'c 'b]`);
      
const example4b = `
(rule [Reachable x y]
  [Link x y])
  
(rule [Reachable x y]
  [Reachable x z] [Link z y])

(rule [Node x]
  [Link x _])
  
(rule [Node y]
  [Link _ y])

(rule [Unreachable x y]
  [Node x] [Node y] (not [Reachable x y]))
`;

testInitialSolve(example4b, `[Link 'a 'b] [Link 'b 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]
   [Node 'a] [Node 'b] [Node 'c]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'b 'b]
   [Unreachable 'c 'a] [Unreachable 'c 'b] [Unreachable 'c 'c]`);

testInitialSolve(example4b, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]
   [Node 'a] [Node 'b] [Node 'c]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'b 'b]
   [Unreachable 'c 'a] [Unreachable 'c 'b]`);
  
testInitialSolve(example4b, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]
   [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd]
   [Node 'a] [Node 'b] [Node 'c] [Node 'd]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'b 'b]
   [Unreachable 'c 'a] [Unreachable 'c 'b]
   [Unreachable 'd 'd] [Unreachable 'd 'c] [Unreachable 'd 'b] [Unreachable 'd 'a]`);
      
testInitialSolve(example4b, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd] [Link 'c 'b]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]
   [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd] [Reachable 'c 'b] [Reachable 'b 'b]
   [Node 'a] [Node 'b] [Node 'c] [Node 'd]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'c 'a]
   [Unreachable 'd 'd] [Unreachable 'd 'c] [Unreachable 'd 'b] [Unreachable 'd 'a]`);

 
testIncrementalAdd(example4b, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd] [Link 'c 'b]`);

testRemoveEdb(example4b, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b] [Link 'c 'b]`);
      

const example5 = `
(rule [Rsum x #:sum y]
  [I x y])

(rule [Rmax x #:max y]
  [I x y])
  
(rule [Rmin x #:min y]
  [I x y])
      
(rule [Rcount x #:count y]
  [I x y])
`;

testInitialSolve(example5, `[I 'a 10] [I 'a 20] [I 'b 33]`,
  `[Rsum 'a 30] [Rsum 'b 33]
   [Rmax 'a 20] [Rmax 'b 33]
   [Rmin 'a 10] [Rmin 'b 33]
   [Rcount 'a 2] [Rcount 'b 1]
  `);


const example6 = `
(rule [B x] [A x])
(rule [C x] [B x])
(rule [E x] [D x])
(rule [C x] [E x])
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

testInitialSolve(`(rule [X 123] [I 456])`, `[I 456]`, `[X 123]`);
testInitialSolve(`(rule [X "abc"] [I "def"])`, `[I "def"]`, `[X "abc"]`);
testInitialSolve(`(rule [X] [I "def"])`, `[I "def"]`, `[X]`);
testInitialSolve(`(rule [X] [I])`, `[I]`, `[X]`);
testInitialSolve(`(rule [X] [I])`, `[J]`, ``); 

testInitialSolve(`(rule [X a b] [I _ _ a _ _ b _ ])`, `[I 0 1 2 3 4 5 6]`, `[X 2 5]`);

// bugfix: more than one neg resulted in clash of identifier names
const example7 = `
(rule [Reachable x y]
  [Link x y])
  
(rule [Reachable x y]
  [Link x z] [Reachable z y])

(rule [Node x]
  [Link x _])
  
(rule [Node y]
  [Link _ y])

(rule [Unreachable x y]
  [Node x] [Node y] (not [Reachable x y]))
  
(rule [Unreachable2 x y]
  [Node x] [Node y] (not [Reachable x y]))
`;
testInitialSolve(example7, `[Link 'a 'b]`, 
  `[Node 'a] [Node 'b] [Reachable 'a 'b]
  [Unreachable2 'a 'a] [Unreachable2 'b 'a] [Unreachable2 'b 'b]
  [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'b 'b]`)

console.log("done: " + (performance.now() - start) + "ms");
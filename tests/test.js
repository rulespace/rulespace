import { performance } from 'perf_hooks';
import { assertTrue, Sets } from 'common';
import { tupleEquals, compileAtoms, atomToFreshModuleTuple, compileToConstructor, sanityCheck } from './test-common.js';

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

function testAdd(src, edbTuplesSrc, expectedIdbTuplesSrc)
{
  const ctr = compileToConstructor(src);
  const edbAtoms = compileAtoms(edbTuplesSrc);
  const expectedIdbAtoms = compileAtoms(expectedIdbTuplesSrc);
  for (const p of permutations(edbAtoms))
  {
    const module = ctr();
    sanityCheck(module);

    const edbTuples = p.map(atom => atomToFreshModuleTuple(module, atom));
    const delta = module.addTuples(edbTuples);
    sanityCheck(module);
    if (!equalTuples(module.edbTuples(), edbTuples)) // TODO we don't check whether tuples actually are sets (should not contain dupes)
    {
      console.error("expected edb tuples: " + edbTuples.join());
      console.error("  module edb tuples: " + [...module.edbTuples()].join());
      throw new Error("assertion failed");
    }
    
    const expectedIdbTuples = expectedIdbAtoms.map(atom => atomToFreshModuleTuple(module, atom));
    const expectedTuples = edbTuples.concat(expectedIdbTuples);
    if (!equalTuples(module.tuples(), expectedTuples))
    {
      console.error("expected tuples: " + [...expectedTuples].join());
      console.error("  module tuples: " + [...module.tuples()].join());
      throw new Error("assertion failed");
    }
    
    const actualDeltaTuples = [...delta.added()].flatMap(kv => kv[1]);
    if (!equalTuples(actualDeltaTuples, expectedTuples))
    {
      console.error("expected delta tuples: " + expectedTuples.join());
      console.error("         delta tuples: " + actualDeltaTuples.join());
      throw new Error("assertion failed");
    }
  }
}

function testAddWithFacts(src, edbTuplesSrc, expectedFactTuplesSrc, expectedIdbTuplesSrc)
{
  const ctr = compileToConstructor(src);
  const edbAtoms = compileAtoms(edbTuplesSrc);
  const expectedIdbAtoms = compileAtoms(expectedIdbTuplesSrc);
  const expectedFactAtoms = compileAtoms(expectedFactTuplesSrc);
  for (const p of permutations(edbAtoms))
  {
    const module = ctr();
    sanityCheck(module);
    const initialTuples = [...module.tuples()]; // only edbs from facts + computed idbs  

    const edbTuples = p.map(atom => atomToFreshModuleTuple(module, atom));
    const expectedFactTuples = expectedFactAtoms.map(atom => atomToFreshModuleTuple(module, atom));
    const delta = module.addTuples(edbTuples);
    sanityCheck(module);
    const expectedEdbTuples = edbTuples.concat(expectedFactTuples);
    if (!equalTuples(module.edbTuples(), expectedEdbTuples))
    {
      console.error("expected edb tuples: " + expectedEdbTuples.join());
      console.error("  module edb tuples: " + [...module.edbTuples()].join());
      throw new Error("assertion failed");
    }
    
    const expectedIdbTuples = expectedIdbAtoms.map(atom => atomToFreshModuleTuple(module, atom));
    const expectedTuples = expectedEdbTuples.concat(expectedIdbTuples);
    if (!equalTuples(module.tuples(), expectedTuples))
    {
      console.error("expected tuples: " + [...expectedTuples].join());
      console.error("  module tuples: " + [...module.tuples()].join());
      throw new Error("assertion failed");
    }
    
    const expectedDeltaTuples = [...Sets.union(Sets.difference(expectedTuples.map(t => t.get()), initialTuples), edbTuples)];
    const actualDeltaTuples = [...delta.added()].flatMap(kv => kv[1]);
    if (!equalTuples(actualDeltaTuples, expectedDeltaTuples))
    {
      console.error("expected delta tuples: " + expectedDeltaTuples.join());
      console.error("         delta tuples: " + actualDeltaTuples.join());
      throw new Error("assertion failed");
    }
  }
}

function testError(src, edbTuplesSrc, expectedErrorMessageStart)
{
  try
  {
    const ctr = compileToConstructor(src);
    const edbAtoms = compileAtoms(edbTuplesSrc);
    const expectedIdbAtoms = compileAtoms(expectedIdbTuplesSrc);
    const module = ctr();
    sanityCheck(module);

    const edbTuples = edbAtoms.map(atom => atomToFreshModuleTuple(module, atom));
    sanityCheck(module);
    if (!equalTuples(module.edbTuples(), edbTuples)) // TODO we don't check whether tuples actually are sets (should not contain dupes)
    {
      console.log("(expected) edb tuples: " + edbTuples.join());
      console.log("    module edb tuples: " + [...module.edbTuples()].join());
      throw new Error("assertion failed");
    }    
    throw new Error(`expected error ${expectedErrorMessageStart}, but got tuples: ${[...module.tuples()].join()}`);
  }
  catch (e)
  {
    const message = String(e);
    if (!message.startsWith(expectedErrorMessageStart))
    {
      throw new Error(`expected error to start with ${expectedErrorMessageStart}, but got the following error: ${e}`);
    }
  }
}

function testIncrementalAdd(src, edbTuplesSrc)
{
  const ctr = compileToConstructor(src);
  const edbAtoms = compileAtoms(edbTuplesSrc);

  for (const s of selections(edbAtoms))
  {
    const nimodule = ctr();
    const edbTuples = s.map(atom => atomToFreshModuleTuple(nimodule, atom));
    nimodule.addTuples(edbTuples);
    sanityCheck(nimodule);
  
    let imodule;

    for (const p of permutations(s))
    {
      try
      {
        imodule = ctr();
        for (const t of p)
        {
          imodule.addTuples([atomToFreshModuleTuple(imodule, t)]);
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
  const edbAtoms = compileAtoms(edbTuplesSrc);
  
  for (const s of selections(edbAtoms))
  {
    let remainingEdbs;
    let nimodule, imodule;
    try
    {
      remainingEdbs = Sets.difference(edbAtoms, s);
      nimodule = ctr();
      nimodule.addTuples([...remainingEdbs].map(atom => atomToFreshModuleTuple(nimodule, atom)));
      sanityCheck(nimodule);
  
      imodule = ctr();
      imodule.addTuples([...edbAtoms].map(atom => atomToFreshModuleTuple(imodule, atom)));
      sanityCheck(imodule);
      imodule.removeTuples([...s].map(atom => atomToFreshModuleTuple(imodule, atom).get()));
      sanityCheck(imodule);
  
      assertTrue(equalTuples(nimodule.tuples(), imodule.tuples()));
    }
    catch (e)
    {
      console.log("edbTuples: " + edbAtoms.join());
      console.log("selection: " + s.join());
      console.log("remaining  " + [...remainingEdbs].join());
      console.log("ni tuples: " + [...nimodule.tuples()]);
      if (imodule) {console.log("i tuples:  " + [...imodule.tuples()])}
      throw e;
    }
  }
}

const start = performance.now();

testAdd(`(rule [X 123] [I 456])`, `[I 456]`, `[X 123]`);
testAdd(`(rule [X "abc"] [I "def"])`, `[I "def"]`, `[X "abc"]`);
testAdd(`(rule [X] [I "def"])`, `[I "def"]`, `[X]`);
testAdd(`(rule [X] [I])`, `[I]`, `[X]`);
testAdd(`(rule [X a b] [I _ _ a _ _ b _ ])`, `[I 0 1 2 3 4 5 6]`, `[X 2 5]`);

// apps
testAdd(`(rule [X a b] [I a b] (= a 3))`, `[I 3 4] [I 5 6]`, `[X 3 4]`);
testAdd(`(rule [X a b] [I a b] (!= a 3))`, `[I 3 4] [I 5 6]`, `[X 5 6]`);

// assign
testAdd(`(rule [X y] [I x] (:= y 123))`, `[I 999]`, `[X 123]`);

// fact rules
testAddWithFacts(`(rule [X 123])`, ``, `[X 123]`, ``);
testAddWithFacts(`(rule [X 123] #t)`, ``, `[X 123]`, ``);
testAddWithFacts(`(rule [X 123] #f)`, ``, ``, ``);
testAddWithFacts(`(rule [X 123]) (rule [Y x] [X x])`, ``, `[X 123]`, `[Y 123]`);
testAddWithFacts(`(rule [X 123]) (rule [Y x] [X x])`, `[X 456]`, `[X 123]`, `[Y 123] [Y 456]`);

// funny chars
testAdd(`(rule [R α‘ «β»] [L α‘ «β»])`, `[L 1 2]`, `[R 1 2]`);

// bug: function symbols in head not analyzed
testAdd(`(rule [R x [V y 9]] [I x y])`, `[I 1 2]`, `[R 1 [V 2 9]]`);

// bug: emit of deltaRemoveNOTTuple in globaEdbStratum used string iso. pred object
testAdd(`(rule [Yes x] [A x]) (rule [No x] [B x] (not [A x]))`, ``, ``);


// === analyzer errors

// AnalysisError: predicate Root is already declared as fynction symbol
testError(`(rule [Lookup x [Root k]] [J x k]) (rule [Root a] [I a b])`, ``, 'AnalysisError');

// AnalysisError: function symbol Root is already declared as predicate
testError(`(rule [Root a] [I a b]) (rule [Lookup x [Root k]] [J x k])`, ``, 'AnalysisError');

// TODO: (strategy for) reserved js words
//testInitialSolve(`(rule [if a b] [let a b] [while a b] [for a b] [const a b])`, ``);

// TODO: when no terms, negation can appear first in body, meaning it's not in a for-loop (no indexing yet!),
// resulting in a 'continue' being emitted that is outside iteration
// this is really an edge case
// testInitialSolve(`(rule [No] (not [A]))`, ``, ``);


// ===
const example1 = `
(rule [Reachable x y]
  [Link x y])
  
(rule [Reachable x y]
  [Reachable x z] [Link z y])
`;
 
testAdd(example1, `[Link 'a 'b] [Link 'b 'c]`, 
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]`);
testAdd(example1, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]`);
testAdd(example1, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c] [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd]`);

testIncrementalAdd(example1, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`);

testRemoveEdb(example1, `[Link 'a 'b] [Link 'b 'c]`);

testRemoveEdb(example1, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b] [Link 'c 'b]`);

// ===
const example2 = `
(rule [Reachable x y]
  [Link x y])
  
(rule [Reachable x y]
  [Link x z] [Reachable z y])
`;

testAdd(example2, `[Link 'a 'b] [Link 'b 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]`);
testAdd(example2, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]`);
testAdd(example2, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c] [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd]`);

testIncrementalAdd(example2, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`);

testRemoveEdb(example2, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b] [Link 'c 'b]`);

// ===
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

testAdd(example3, `[Link 'a 'b] [Link 'b 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]
   [Node 'a] [Node 'b] [Node 'c]`);

testAdd(example3, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]
   [Node 'a] [Node 'b] [Node 'c]`);

testAdd(example3, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c] [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd]
   [Node 'a] [Node 'b] [Node 'c] [Node 'd]`);

testIncrementalAdd(example3, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`);

testRemoveEdb(example3, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b] [Link 'c 'b]`);
   
// ===
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

testAdd(example4, `[Link 'a 'b] [Link 'b 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]
   [Node 'a] [Node 'b] [Node 'c]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'b 'b]
   [Unreachable 'c 'a] [Unreachable 'c 'b] [Unreachable 'c 'c]`);

testAdd(example4, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]
   [Node 'a] [Node 'b] [Node 'c]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'b 'b]
   [Unreachable 'c 'a] [Unreachable 'c 'b]`);
  
testAdd(example4, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]
   [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd]
   [Node 'a] [Node 'b] [Node 'c] [Node 'd]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'b 'b]
   [Unreachable 'c 'a] [Unreachable 'c 'b]
   [Unreachable 'd 'd] [Unreachable 'd 'c] [Unreachable 'd 'b] [Unreachable 'd 'a]`);
      
testAdd(example4, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd] [Link 'c 'b]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]
   [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd] [Reachable 'c 'b] [Reachable 'b 'b]
   [Node 'a] [Node 'b] [Node 'c] [Node 'd]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'c 'a]
   [Unreachable 'd 'd] [Unreachable 'd 'c] [Unreachable 'd 'b] [Unreachable 'd 'a]`);

 
testIncrementalAdd(example4, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd] [Link 'c 'b]`);

testRemoveEdb(example4, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b] [Link 'c 'b]`);
      
// ===
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

testAdd(example4b, `[Link 'a 'b] [Link 'b 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c]
   [Node 'a] [Node 'b] [Node 'c]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'b 'b]
   [Unreachable 'c 'a] [Unreachable 'c 'b] [Unreachable 'c 'c]`);

testAdd(example4b, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]
   [Node 'a] [Node 'b] [Node 'c]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'b 'b]
   [Unreachable 'c 'a] [Unreachable 'c 'b]`);
  
testAdd(example4b, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]
   [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd]
   [Node 'a] [Node 'b] [Node 'c] [Node 'd]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'b 'b]
   [Unreachable 'c 'a] [Unreachable 'c 'b]
   [Unreachable 'd 'd] [Unreachable 'd 'c] [Unreachable 'd 'b] [Unreachable 'd 'a]`);
      
testAdd(example4b, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd] [Link 'c 'b]`,
  `[Reachable 'a 'b] [Reachable 'b 'c] [Reachable 'a 'c] [Reachable 'c 'c]
   [Reachable 'c 'd] [Reachable 'b 'd] [Reachable 'a 'd] [Reachable 'c 'b] [Reachable 'b 'b]
   [Node 'a] [Node 'b] [Node 'c] [Node 'd]
   [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'c 'a]
   [Unreachable 'd 'd] [Unreachable 'd 'c] [Unreachable 'd 'b] [Unreachable 'd 'a]`);

 
testIncrementalAdd(example4b, `[Link 'a 'b] [Link 'b 'c] [Link 'c 'c] [Link 'c 'd] [Link 'c 'b]`);

testRemoveEdb(example4b, `[Link 'c 'd] [Link 'c 'c] [Link 'b 'c] [Link 'a 'b] [Link 'c 'b]`);
      

// ===
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

testAdd(example5, `[I 'a 10] [I 'a 20] [I 'b 33]`,
  `[Rsum 'a 30] [Rsum 'b 33]
   [Rmax 'a 20] [Rmax 'b 33]
   [Rmin 'a 10] [Rmin 'b 33]
   [Rcount 'a 2] [Rcount 'b 1]
  `);

// ===
const example6 = `
(rule [B x] [A x])
(rule [C x] [B x])
(rule [E x] [D x])
(rule [C x] [E x])
`;

testAdd(example6, `[A 1] [A 2] [D 3] [D 4]`,
  `[B 1] [B 2] [C 1] [C 2]
   [E 3] [E 4] [C 3] [C 4]
  `);

testAdd(example6, `[A 1] [A 2] [A 3] [A 4] [D 1] [D 2] [D 3] [D 4]`,
  `[B 1] [B 2] [B 3] [B 4]
   [E 1] [E 2] [E 3] [E 4]
   [C 1] [C 2] [C 3] [C 4]
  `);

testIncrementalAdd(example6, `[A 1] [A 2] [A 3] [A 4] [D 1] [D 2] [D 3] [D 4]`);

testRemoveEdb(example6, `[A 1] [A 2] [A 3] [A 4] [D 1] [D 2] [D 3] [D 4]`);


// === bugfix: more than one neg resulted in clash of identifier names
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
testAdd(example7, `[Link 'a 'b]`, 
  `[Node 'a] [Node 'b] [Reachable 'a 'b]
  [Unreachable2 'a 'a] [Unreachable2 'b 'a] [Unreachable2 'b 'b]
  [Unreachable 'a 'a] [Unreachable 'b 'a] [Unreachable 'b 'b]`)


// ===
const example8 = 
`
(rule [B x] [A x])
(rule [C x] [B x])
(rule [D x] [C x])
(rule [B x] [A2 x])
(rule [B x] [D x])
(rule [R x] [B x])
`

testAdd(example8, `[A 1] [A2 2] [A 3]`,
  `[B 1] [C 1] [D 1] [R 1]
    [B 2] [C 2] [D 2] [R 2]
    [B 3] [C 3] [D 3] [R 3]
  `);
testIncrementalAdd(example8, `[A 1] [A 2] [A 3]`);
testRemoveEdb(example8, `[A 1] [A 2] [A 3]`);

// ===
const example9 =
`
(rule [Rsum x #:sum y]
  [I x z] [J z y])

(rule [Rmax x #:max y]
  [I x z] [J z y])
  `

testAdd(example9, `[I 'a 'aa] [J 'aa 10] [J 'bb 20] [I 'a 'bb]`,
  `[Rsum 'a 30] [Rmax 'a 20]
  `);
testIncrementalAdd(example9, `
[I 'a 'aa] [J 'aa 10] 
[I 'a 'bb] [J 'bb 20] [J 'bb 30]
[I 'b 'bb] [J 'bb 40]
`);


// ===
const example10 =
`
(rule [R x [V y 9]]
  [I x y])

(rule [S a b c]
  [R a [V b c]])
`;
testAdd(example10, `[I 1 2] [I 3 4]`,
  `[R 1 [V 2 9]] [S 1 2 9]
   [R 3 [V 4 9]] [S 3 4 9]
  `);

// === bug: duplicate identifier names in generated code for recursive rules
const example11 =
`
(rule [Reachable e2 ctx2] [Reachable e1 ctx1] [Step e1 ctx1 e2 ctx2])
(rule [Step e1 ctx e2 ctx2] [Lit e1 _] [Reachable e1 ctx] [Cont e1 ctx1 e2 ctx2])
(rule [Step e1 ctx e2 ctx2] [Id e1 _] [Reachable e1 ctx] [Cont e1 ctx1 e2 ctx2])
`;

testAdd(example11, ``, ``); 

// === 
// const example12 =
// `
// `

// testInitialSolve(example12, ``, ``); 


// ============
console.log("done: " + (performance.now() - start) + "ms");



import { assertTrue, Sets } from '../deps.ts';
import { tupleEquals, compileAtoms, atomToFreshModuleTuple, compileToConstructor, sanityCheck } from './test-common.js';
import { Atom, Lit, Var } from '../rsp.js';

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


function containsMatchingAtom(t, ts)
{
  for (const tt of ts)
  {
    if (atomMatch(t, tt))
    {
      return true;
    }
  }
  return false;
}


function mtupleToAtom(mtuple)
{
  const pred = mtuple.constructor.name;
  const values = [];
  for (const value of mtuple.values())
  {
    if (typeof value === "number" || typeof value === "string" || value === true || value === false)
    {
      values.push(new Lit(value));
    }
    else if (typeof value === 'object') 
    {
      if (value._inproducts || value._outproducts) // TODO: maybe replace by isXXX on the module interface
      {
        values.push(mtupleToAtom(value));
      }
      else 
      {
        values.push(value);
      }
    }
    else if (typeof value === 'function')
    {
      values.push(value);
    }
    else
    {
      throw new Error(`cannot handle value ${value} in ${mtuple}`)
    }
  }
  return new Atom(pred, values);
}

function atomMatch(actual, expected)
{
  if (actual.pred !== expected.pred)
  {
    return false;
  }
  if (actual.arity() !== expected.arity())
  {
    return false;
  }
  for (let i = 0; i < actual.arity(); i++)
  {
    const t1 = actual.terms[i];
    const t2 = expected.terms[i];
    if (!termMatch(t1, t2))
    {
      return false;
    }
  }
  return true;
}

function termMatch(actual, expected)
{
  if (expected instanceof Var && expected.name === "_")
  {
    return true;
  }
  if (actual instanceof Lit && expected instanceof Lit)
  {
    return actual.value === expected.value;
  }
  if (actual instanceof Atom && expected instanceof Atom)
  {
    return atomMatch(actual, expected);
  }
  return false;
}

function equalAtoms(actual, expected)
{
  const as1 = [...actual]; // actual
  const as2 = [...expected]; // expected
  if (as1.length !== as2.length)
  {
    return false;
  }
  for (const t1 of as1)
  {
    if (!containsMatchingAtom(t1, as2))
    {
      return false;
    }
  }
  return true;
}


function test(src, expectedTuplesSrc)
{
  const ctr = compileToConstructor(src, {assertions:true, info:false});
  const expectedAtoms = compileAtoms(expectedTuplesSrc);

  const module = ctr();
  //sanityCheck(module);

  const moduleAtoms = [...module.tuples()].map(mtupleToAtom);
  if (!equalAtoms(moduleAtoms, expectedAtoms))
  {
    console.error("expected atoms: " + expectedAtoms.join());
    console.error("  module atoms: " + moduleAtoms.join());
    throw new Error("assertion failed");
  }
}

function testAdd(src, edbTuplesSrc, expectedIdbTuplesSrc)
{
  const ctr = compileToConstructor(src, {assertions:true, info:false});
  const edbAtoms = compileAtoms(edbTuplesSrc);
  const expectedIdbAtoms = compileAtoms(expectedIdbTuplesSrc);
  for (const p of permutations(edbAtoms))
  {
    const module = ctr();
    // sanityCheck(module);
    const initialTuples = [...module.tuples()]; // only facts + computed idbs  


    const edbTuples = p.map(atom => atomToFreshModuleTuple(module, atom));
    const delta = module.addTuples(edbTuples);
    // sanityCheck(module);
    // if (!equalTuples(module.edbTuples(), edbTuples)) // TODO we don't check whether tuples actually are sets (should not contain dupes)
    // {
    //   console.error("expected edb tuples: " + edbTuples.join());
    //   console.error("  module edb tuples: " + [...module.edbTuples()].join());
    //   throw new Error("assertion failed");
    // }
    
    const expectedIdbTuples = expectedIdbAtoms.map(atom => atomToFreshModuleTuple(module, atom));
    const expectedTuples = edbTuples.concat(expectedIdbTuples);
    if (!equalTuples(module.tuples(), expectedTuples))
    {
      console.error("expected tuples: " + [...expectedTuples].join());
      console.error("  module tuples: " + [...module.tuples()].join());
      throw new Error("assertion failed");
    }
    
    const actualDeltaTuples = [...delta.added()].flatMap(kv => kv[1]);
    const expectedDeltaTuples = [...Sets.difference(module.tuples(), initialTuples)];
    if (!equalTuples(actualDeltaTuples, expectedDeltaTuples))
    {
      console.error("expected delta tuples: " + expectedDeltaTuples.join());
      console.error("         delta tuples: " + actualDeltaTuples.join());
      throw new Error("assertion failed");
    }
  }
}

/** only tests simple adding, no permutations or anything */
function testSimpleAdd(src, edbTuplesSrc, expectedTuplesSrc)
{
  const ctr = compileToConstructor(src, {assertions:true, info:false});
  const edbAtoms = compileAtoms(edbTuplesSrc);
  const expectedAtoms = compileAtoms(expectedTuplesSrc);
  const module = ctr();
  // sanityCheck(module);
  const initialTuples = [...module.tuples()]; // only facts + computed idbs  


  const edbTuples = edbAtoms.map(atom => atomToFreshModuleTuple(module, atom));
  const delta = module.addTuples(edbTuples);
  const expectedTuples = expectedAtoms.map(atom => atomToFreshModuleTuple(module, atom));
  if (!equalTuples(module.tuples(), expectedTuples))
  {
    console.error("expected tuples: " + [...expectedTuples].join());
    console.error("  module tuples: " + [...module.tuples()].join());
    throw new Error("assertion failed");
  }
  
  const actualDeltaTuples = [...delta.added()].flatMap(kv => kv[1]);
  const expectedDeltaTuples = [...Sets.difference(module.tuples(), initialTuples)];
  if (!equalTuples(actualDeltaTuples, expectedDeltaTuples))
  {
    console.error("expected delta tuples: " + expectedDeltaTuples.join());
    console.error("         delta tuples: " + actualDeltaTuples.join());
    throw new Error("assertion failed");
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

// matching
testAdd(`(rule [X 123] [I 456])`, `[I 456]`, `[X 123]`);
testAdd(`(rule [X "abc"] [I "def"])`, `[I "def"]`, `[X "abc"]`);
testAdd(`(rule [X] [I "def"])`, `[I "def"]`, `[X]`);
testAdd(`(rule [X] [I])`, `[I]`, `[X]`);
testAdd(`(rule [X a b] [I _ _ a _ _ b _ ])`, `[I 0 1 2 3 4 5 6]`, `[X 2 5]`);

// negation
test(`(rule [R] (not [I 1])) (rule [I 1])`, `[I 1]`);
test(`(rule [R] (not [I 1])) (rule [I 2])`, `[R] [I 2]`);
test(`(rule [R] (not [I 1]) [I 2]) (rule [I 2])`, `[R] [I 2]`);
test(`(rule [R] (not [I 1]) [I 2]) (rule [I 1])`, `[I 1]`);
test(`(rule [R] (not [I 1]) [I 2]) (rule [I 1]) (rule [I 2])`, `[I 1] [I 2]`);
testAdd(`(rule [R] (not [I 1]))`, `[I 1]`, ``);
testAdd(`(rule [R] (not [I 1]))`, `[I 2]`, `[R]`);
testAdd(`(rule [R] (not [I 1]) [I 2])`, `[I 2]`, `[R]`);
testAdd(`(rule [R] (not [I 1]) [I 2])`, `[I 1]`, ``);
testAdd(`(rule [R] (not [I 1]) [I 2])`, `[I 1] [I 2]`, ``);

// functors
testAdd(`(rule [R [X x]] [I x])`, `[I 123]`, `[R [X 123]]`);
testAdd(`(rule [R [X [Y y]]] [I y])`, `[I 123]`, `[R [X [Y 123]]]`);
testAdd(`(rule [R [X [Y] y]] [I y])`, `[I 123]`, `[R [X [Y] 123]]`);

// matching with multiple occurrences of same var in single atom
testAdd(`(rule [R x y z] [I x y x z])`, `[I 1 2 1 3]`, `[R 1 2 3]`);
testAdd(`(rule [R x y z] [I x y y x z x])`, `[I 1 2 2 1 3 1]`, `[R 1 2 3]`);
testAdd(`(rule [R x y z] [I x y x z])`, `[I 1 2 9 3]`, ``);
testAdd(`(rule [R a b c d e f g] [I a b c e [S a c d f] a b d g])`, `[I 1 2 3 5 [S 1 3 4 6] 1 2 4 7]`, `[R 1 2 3 4 5 6 7]`);
testAdd(`(rule [R a b c d e f g x y z] [H x y z] [I a b c e x [S a c d f y] a b d g z])`, `[H 11 22 33] [I 1 2 3 5 11 [S 1 3 4 6 22] 1 2 4 7 33]`, `[R 1 2 3 4 5 6 7 11 22 33]`);

// apps
testAdd(`(rule [X a b] [I a b] (= a 3))`, `[I 3 4] [I 5 6]`, `[X 3 4]`);
testAdd(`(rule [X a b] [I a b] (!= a 3))`, `[I 3 4] [I 5 6]`, `[X 5 6]`);

test(`(rule [R x] (:= x (+ 1 2)))`, `[R 3]`);
test(`(rule [R x] (:= x (- 3 2)))`, `[R 1]`);
test(`(rule [R x] (:= x (* 4 2)))`, `[R 8]`);
test(`(rule [R x] (:= x (/ 16 4)))`, `[R 4]`);

test(`(rule [R x] (:= x (and)))`, `[R #t]`);
test(`(rule [R x] (:= x (and #t)))`, `[R #t]`);
test(`(rule [R x] (:= x (and #f)))`, `[R #f]`);
test(`(rule [R x] (:= x (and #f #t)))`, `[R #f]`);
test(`(rule [R x] (:= x (and #t #f)))`, `[R #f]`);
test(`(rule [R x] (:= x (and #t #t)))`, `[R #t]`);
test(`(rule [R x] (:= x (and 0 #t)))`, `[R #t]`);
test(`(rule [R x] (:= x (and #t 0)))`, `[R 0]`);
test(`(rule [R x] (:= x (and 1 2 3)))`, `[R 3]`);
test(`(rule [R x] (:= x (and 1 #f 3)))`, `[R #f]`);
test(`(rule [R x] (:= x (and 0)))`, `[R 0]`);
test(`(rule [R x] (:= x (or)))`, `[R #t]`);
test(`(rule [R x] (:= x (or #t)))`, `[R #t]`);
test(`(rule [R x] (:= x (or #f)))`, `[R #f]`);
test(`(rule [R x] (:= x (or #f #t)))`, `[R #t]`);
test(`(rule [R x] (:= x (or #t #f)))`, `[R #t]`);
test(`(rule [R x] (:= x (or #t #t)))`, `[R #t]`);
test(`(rule [R x] (:= x (or 0 #t)))`, `[R 0]`);
test(`(rule [R x] (:= x (or #t 0)))`, `[R #t]`);
test(`(rule [R x] (:= x (or 1 2 3)))`, `[R 1]`);
test(`(rule [R x] (:= x (or 1 #f 3)))`, `[R 1]`);
test(`(rule [R x] (:= x (or 0)))`, `[R 0]`);
test(`(rule [R x] (:= x (not #f)))`, `[R #t]`);
test(`(rule [R x] (:= x (not #t)))`, `[R #f]`);
test(`(rule [R x] (:= x (not 0)))`, `[R #f]`);
test(`(rule [R x] (:= x (not 1)))`, `[R #f]`);
test(`(rule [R x] (:= x (even? 123)))`, `[R #f]`);
test(`(rule [R x] (:= x (even? 124)))`, `[R #t]`);

test(`(rule [R x] (:= x (+ 1)))`, `[R 1]`);
test(`(rule [R x] (:= x (+ 1 2 3)))`, `[R 6]`);
test(`(rule [R x] (:= x (- 1 2 3)))`, `[R -4]`);
test(`(rule [R x] (:= x (- 123)))`, `[R -123]`);
test(`(rule [R x] (:= x (+ 1 (* 2 3) 4)))`, `[R 11]`);
test(`(rule [R x] (:= x (* 1 (+ 2 3) 4)))`, `[R 20]`);
test(`(rule [R x] (:= x (* 1 (+ 2 3) 4)))`, `[R 20]`);
test(`(rule [R x] (:= x (/ 8 2)))`, `[R 4]`); // no test for single-arg (e.g. (/ 5)) because results in float
test(`(rule [R x] (:= x (< 3 4 5)))`, `[R #t]`);
test(`(rule [R x] (:= x (< 3 2 5)))`, `[R #f]`);
test(`(rule [R x] (:= x (= 3 3 3)))`, `[R #t]`);
test(`(rule [R x] (:= x (= 3 2 3)))`, `[R #f]`);
test(`(rule [R x] (:= x (not #t)))`, `[R #f]`);
test(`(rule [R x] (:= x (not #f)))`, `[R #t]`);

// first-class funs (retest because of different path for first-order ('direct') and h-o apps)
test(`(rule [R x] (:= proc +) (:= x (proc 1 2 3)))`, `[R 6]`);
test(`(rule [R x] (:= proc -) (:= x (proc 1 2 3)))`, `[R -4]`);
test(`(rule [R x] (:= proc <) (:= x (proc 3 4)))`, `[R #t]`);
test(`(rule [R x] (:= proc even?) (:= x (proc 5)))`, `[R #f]`);
test(`(rule [R x] (:= proc even?) (:= x (proc 6)))`, `[R #t]`);
test(`(rule [R x] (:= proc not) (:= x (proc #t)))`, `[R #f]`);
//testAdd(`(rule [J [prim +]] [I]) (rule [R x] [J [prim proc]] (:= x (proc 1 2 3)))`, `[I]`, `[R 6]`); toString() of proc gives trouble (how to test/stabilize this?)

// assign
testAdd(`(rule [X y] [I x] (:= y 123))`, `[I 999]`, `[X 123]`);

// fact rules
test(`(rule [X 123])`, `[X 123]`);
test(`(rule [X 123] #t)`, `[X 123]`);
test(`(rule [X 123] #f)`, ``);
test(`(rule [R] (not #f))`, `[R]`);
test(`(rule [X 123]) (rule [Y x] [X x])`, `[X 123] [Y 123]`);
testAdd(`(rule [X 123]) (rule [Y x] [X x])`, `[X 456]`, `[X 123] [Y 123] [Y 456]`);
test(`(rule [X 0]) (rule [X a] [X b] (< b 5) (:= a (+ b 1)))`, `[X 0] [X 1] [X 2] [X 3] [X 4] [X 5]`);

// lambdas
test(`(rule [F (lambda () 123)]) (rule [R x] [F f] (:= x (f)))`, `[F _] [R 123]`);
// TODO: alloc not allowed in that position: test(`(rule [F f] (:= x 123) (:= f (lambda () x))) (rule [R x] [F f] (:= x (f)))`, `[F _] [R 123]`);
test(`(rule [F (lambda (x) [Functor x])]) (rule [R (f 123)] [F f])`, `[F _] [R [Functor 123]]`);
test(`(rule [F x (lambda () x)] (:= x 123)) (rule [R x] [F _ f] (:= x (f)))`, `[F 123 _] [R 123]`);

// aggregation/groupby
test(`(rule [R #:max x] [I x]) (rule [I 1]) (rule [I 2])`, `[R 2] [I 1] [I 2]`);

// funny chars
testAdd(`(rule [R α‘ «β»] [L α‘ «β»])`, `[L 1 2]`, `[R 1 2]`);

// external names
globalThis.globalf = x => x*x;
test(`(rule [O x] (:= x (globalf 4)))`, `[O 16]`);

// relation declarations
testSimpleAdd(`(relation [T x y z])`, `[T 1 2 3]`, `[T 1 2 3]`);
test(`(relation [T x y z]) (rule [T 1 2 3])`, `[T 1 2 3]`);
testAdd(`(relation [T x y z])`, `[T 1 2 3]`, ``); // must be edb tuple (so no idb tuples)

// bug: function symbols in head not analyzed
testAdd(`(rule [R x [V y 9]] [I x y])`, `[I 1 2]`, `[R 1 [V 2 9]]`);

// bug: emit of deltaRemoveNOTTuple in globaEdbStratum used string iso. pred object
testAdd(`(rule [Yes x] [A x]) (rule [No x] [B x] (not [A x]))`, ``, ``);

// bug: adding more than one fact caused array/Set confusion
test(`(rule [X 1]) (rule [X 2])`, `[X 1] [X 2]`);

// bug (parser): parser confused by '-' before ']' (resulted in NaN)
test(`(rule [G "+" +]) (rule [G "-" -]) (rule [R x] [G _ proc] (:= x (proc 3 4 5)))`, `[G "+" _] [G "-" _] [R 12] [R -6]`);

// bug: negation first in body caused a 'continue' being emitted outside iteration
// bug: negation of 0-arity predicate caused wrong member emit (NOT_pred not following pred)
test(`(rule [No] (not [A]))`, `[No]`);

// bug
test(`
(rule [R x #:count m] [A x m])
(rule [A 1 12])
(rule [A 1 13])
(rule [A 1 133])
(rule [A 1 134])`, `[A 1 12] [A 1 13] [A 1 133] [A 1 134] [R 1 4]`);

// === AnalysisErrors

// AnalysisError: predicate Root is already declared as function symbol
testError(`(rule [Lookup x [Root k]] [J x k]) (rule [Root a] [I a b])`, ``, 'AnalysisError');

// AnalysisError: function symbol Root is already declared as predicate
testError(`(rule [Root a] [I a b]) (rule [Lookup x [Root k]] [J x k])`, ``, 'AnalysisError');

// TODO: (strategy for) reserved js words
//testInitialSolve(`(rule [if a b] [let a b] [while a b] [for a b] [const a b])`, ``);

// === RspJsCompilationErrors

// RspJsCompilationError: unable to stratify program: cyclic negation of predicate B in (rule [A] ¬[B])
testError(`(rule [B] [A]) (rule [A] (not [B]))`, ``, 'RspJsCompilationError');

// RspJsCompilationError: unable to stratify program: cyclic negation of predicate D in (rule [E] [A] ¬[C] ¬[D])
testError(`(rule [C] [A]) (rule [D] [B]) (rule [E] [A] (not [C]) (not [D])) (rule [B] [E])`, ``, 'RspJsCompilationError');


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
testRemoveEdb(example9, `[I 'a 'aa] [J 'aa 10] 
[I 'a 'bb] [J 'bb 20] [J 'bb 30]
[I 'b 'bb] [J 'bb 40]`);


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

// ===
const example10b =
`
(rule [R x [L [V y 9]]]
  [I x y])

(rule [S a b c]
  [R a [L [V b c]]])
`;
testAdd(example10b, `[I 1 2] [I 3 4]`,
  `[R 1 [L [V 2 9]]] [S 1 2 9]
   [R 3 [L [V 4 9]]] [S 3 4 9]
  `);

// === bug: duplicate identifier names in generated code for recursive rules
const example11 =
`
(rule [Reachable e2 ctx2] [Reachable e1 ctx1] [Step e1 ctx1 e2 ctx2])
(rule [Step e1 ctx e2 ctx2] [Lit e1 _] [Reachable e1 ctx] [Cont e1 ctx1 e2 ctx2])
(rule [Step e1 ctx e2 ctx2] [Id e1 _] [Reachable e1 ctx] [Cont e1 ctx1 e2 ctx2])
`;

testAdd(example11, ``, ``); 

// === bug: when removing [I 10]: [F 5 120] depends on [F 4 24], and both depend on grounded [I 5]
// for [F 5 120], [I 5] was discovered as grounded and added to seen set, and when checking [F 4 24] this wrongly triggered cycle detector
const example12 =
`
(rule [F 0 1])
(rule [F a x] [I n] [F b y] (:= a (+ b 1)) (<= a n) (:= x (* a y)))
(rule [Factorial n x] [I n] [F n x])
`

testAdd(example12, `[I 5] [I 10]`, `[F 0 1] [F 1 1] [F 2 2] [F 3 6] [F 4 24] [F 5 120]
                                    [F 6 720] [F 7 5040] [F 8 40320] [F 9 362880] [F 10 3628800]
                                    [Factorial 10 3628800] [Factorial 5 120]`); 


// ===
const example13 =
`
(rule [CancellationsToday user today #:count user] [BookingCanceled user today _])

(rule [Cancellations #:sum count] [CancellationsToday user today count])
 `

testAdd(example13, `
[BookingCanceled "user" 1 1]
[BookingCanceled "user" 1 2]
[BookingCanceled "user" 1 3]
[BookingCanceled "user" 2 1]
[BookingCanceled "user" 2 2]
[BookingCanceled "user2" 2 3]
`,
`
[CancellationsToday "user" 1 3]
[CancellationsToday "user" 2 2]
[CancellationsToday "user2" 2 1]
[Cancellations 6]
`);
testIncrementalAdd(example13, `
[BookingCanceled "user" 1 1]
[BookingCanceled "user" 1 2]
[BookingCanceled "user" 1 3]
[BookingCanceled "user" 2 1]
[BookingCanceled "user" 2 2]
[BookingCanceled "user2" 2 3]
`);
testRemoveEdb(example13, `
[BookingCanceled "user" 1 1]
[BookingCanceled "user" 1 2]
[BookingCanceled "user" 1 3]
[BookingCanceled "user" 2 1]
[BookingCanceled "user" 2 2]
[BookingCanceled "user2" 2 3]
`);

// ============
console.log("done: " + (performance.now() - start) + "ms");



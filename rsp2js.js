import { MutableArrays, assertTrue } from 'common';
import { Atom, Neg, Agg, Var, Lit, Assign, App } from './rsp.js';
import { analyzeProgram } from './analyzer.js';
import { Sym } from './sexp-reader.js';

class RspJsCompilationError extends Error
{
  constructor(msg)
  {
    super(msg);
    this.name = 'RspJsCompilationError';
  }
}


// class LineEmitter
// {
//   constructor()
//   {
//     this.lines = [];
//   }
//   add(line)
//   {
//     this.lines.push(line);
//   }
//   toString()
//   {
//     return this.lines.join('\n');
//   }
// }

function nameEnc(str) // TODO: too basic // TODO: register term names in map: surface name -> compiled name (term0, term1, ...)
{
  let sb = "_";
  for (const c of str)
  {
    if (c === "‘" || c === "’" ||
        c === "“" || c === "”" ||
        c === "«" || c === "»" ||
        c === "…" || c === "?" ||
        c === "+" || c === "-" || c === "*" || c === "/" || c === "=" || c === "<" || c === ">"
       )
    {
       sb += c.charCodeAt(0);
    }
    else
    {
      sb += c;
    }
  }
  return sb;
}

class DynamicVars
{
  constructor(initial)
  {
    this.initial = initial;
    this.vars = new Set();
  }
  add(name)
  {
    this.vars.add(name);
  }
  names()
  {
    return [...this.vars];
  }
  toString()
  {
    return [...this.vars].map(name => `let ${name} = ${this.initial}`).join('\n');
  }  
}

// when used as first-class values (else, they are directly compiled)
const nativeFuns = new Map([
  ['+', (...args) => args.reduce((acc, x) => acc + x)],
  ['-', (...args) => args.reduce((acc, x) => acc - x)],
  ['*', (...args) => args.reduce((acc, x) => acc * x)],
  ['<', (...args) => args.slice(1).every(x => args[0] < x)],
  ['>', (...args) => args.slice(1).every(x => args[0] > x)],
  ['<=', (...args) => args.slice(1).every(x => args[0] <= x)],
  ['>=', (...args) => args.slice(1).every(x => args[0] >= x)],
  ['=', (...args) => args.slice(1).every(x => args[0] === x)],
  ['even?', arg => arg % 2 === 0],
  ['odd?', arg => arg % 2 === 1]
]);

const nativeFunNames = [...nativeFuns.keys()];

function isNativeFunName(x)
{
  return nativeFunNames.includes(x);
}

class RequiredBuiltInFuns
{
  constructor()
  {
    this.set = new Set();
  }

  add(name)
  {
    this.set.add(name);
    return nameEnc(name);
  }

  toString()
  {
    return [...this.set].map(name => `const ${nameEnc(name)} = ${nativeFuns.get(name)}; // ${name}`).join('\n');
  }
}
const requiredBuiltInFunDefs = new RequiredBuiltInFuns();

export function rsp2js(rsp, options={})
{
  const analysis = analyzeProgram(rsp);
  const strata = analysis.strata;
  const preds = analysis.preds;

  for (const stratum of strata)
  {
    const stratumPreds = analysis.stratumPreds(stratum);
    for (const pred of stratumPreds)
    {
      for (const stratumRule of analysis.predRules(pred))
      {
        for (const atom of stratumRule.body)
        {
          if (atom instanceof Neg)
          {
            const posAtom = atom.atom;
            const negatedPred = analysis.name2pred.get(posAtom.pred);
            if (stratumPreds.includes(negatedPred))
            {
              throw new RspJsCompilationError(`unable to stratify program: cyclic negation of predicate ${negatedPred} in ${stratumRule}\n(stratum predicates: ${stratum.preds.join()})`);
            }
          }
        }  
      }
    }
  }

  const edbPreds = preds.filter(pred => pred.edb);
  const rules = analysis.program.rules;

  // options + emitters
  const OPT_module = options.module === true ? true : false;
  const FLAG_compile_to_module = OPT_module;
  const FLAG_compile_to_ctr = !OPT_module;
  const publicFunctions = [];
  const publicFunction = name => { publicFunctions.push(name); return `${FLAG_compile_to_module ? 'export ' : ''}function ${name}`};
  const publicFunctionStar = name => { publicFunctions.push(name); return `${FLAG_compile_to_module ? 'export ' : ''}function* ${name}`};

  
  const FLAG_debug = options.debug === true ? true : false;
  const logDebug = FLAG_debug ? str => `console.log(${str})` : () => ``;

  const FLAG_profile = options.profile === true ? true : false;
  const profileVars = new DynamicVars("0");
  // const profile = FLAG_profile ? str => str : () => ``;
  const profileStart = FLAG_profile ? name => `const ${name}Start = performance.now();` : () => ``;
  const profileEnd = FLAG_profile ? name =>
    { 
      profileVars.add(name + "Duration");
      profileVars.add(name + "Calls");
      return `
        ${name}Duration += performance.now() - ${name}Start;
        ${name}Calls++;
        `;
    } : () => ``;

  const FLAG_assertions = options.assertions === true ? true : false;
  const assert = FLAG_assertions ? (condition, display='"(?)"', explanation='assertion failed') => `if (!(${condition})) {throw new Error(${display} + ': ${explanation}')} ` : () => ``;
  // end options + emitters

  function main()
  {

    const sb = [profileVars, requiredBuiltInFunDefs];

    if (FLAG_compile_to_ctr)
    {
      sb.push(`"use strict";`);
    }

    if (FLAG_compile_to_module && FLAG_profile)
    {
      sb.push(`import { performance } from 'perf_hooks'`);
    }

    // const dynamicEmitFirst = new LineEmitter();
    // sb.push(dynamicEmitFirst);

    if (FLAG_profile)
    {
      sb.push(`console.log("profiling on")`);
    }
    if (FLAG_assertions)
    {
      sb.push(`console.log("assertions on")`);
    }

    sb.push(emitFirst());

    for (const functor of analysis.functors())
    {
      sb.push(emitFunctorObject(functor));
    }


    for (const pred of preds)
    {
      sb.push(`
  //////////////////////////////////////////////////
  // ${pred.edb ? 'ebd' : 'idb'} pred ${pred.name}(${pred.arity})
  // precedes: ${[...pred.precedes].join(',')}
  // posDependsOn: ${[...pred.posDependsOn].join(',')}
  // negDependsOn: ${[...pred.negDependsOn].join(',')}
  // posAppearsIn: ${[...pred.posAppearsIn].join(',')}
  // negAppearsIn: ${[...pred.negAppearsIn].join(',')}
      `);

      sb.push(emitTupleObject(pred));
      //sb.push(emitGetTuple(pred));
      if (pred.edb)
      {
        sb.push(emitDeltaAddTuple(pred));
      }
      
      // if (pred.edb)
      // {
      //   sb.push(emitAddTuple(pred, strata));
      // }
      for (const rule of pred.rules)
      {
        sb.push(`/* ${rule} */`);
        if (rule.aggregates())
        {
          sb.push(emitRuleGB(rule));
        }
        else
        {
          sb.push(emitRule(rule));
        }
      }
    }

    sb.push(`const facts = new Map();`); 
    sb.push(logDebug('"adding edb tuples due to fact addition by firing fact rule"')); 
    for (const pred of preds)
    {
      for (const rule of pred.rules)
      {
        if (rule.tupleArity() === 0)
        {
          const producesPred = rule.head.pred;

          sb.push(`/* fact: ${rule} */`);// TODO delta pos and tuple not required for fact rules
          sb.push(`
          const new_Rule${rule._id}_tuples = fireRule${rule._id}(-1, []);
          const existing_Rule${rule._id}_tuples = facts.get(${pred});
          if (existing_Rule${rule._id}_tuples === undefined)
          {
            facts.set(${pred}, [...new_Rule${rule._id}_tuples]);
          }
          else
          {
            MutableArrays.addAll(existing_Rule${rule._id}_tuples, new_Rule${rule._id}_tuples);  
          }
          `);
        }
      }
    }
    sb.push(`
    if (facts.size > 0)
    {
      ${logDebug('"computing idb tuples due to addition of fact edbs"')}; 
      addTupleMap(facts);
    }
    `)

    ////////////////


    const pred2getters = preds.map(pred => `['${pred}', get_${pred}]`);
    sb.push(`const pred2getter = new Map([${pred2getters.join()}])`);

    sb.push(emitComputeDelta(strata, preds));
    sb.push(emitRemoveTuples(strata));
    
    sb.push(emitIterators(preds, edbPreds, rules));
    sb.push(emitClear(edbPreds));

    ////////////////

    if (FLAG_profile)
    {
      sb.push(emitProfileResults());
    }

    if (FLAG_compile_to_ctr)
    {
      sb.push(`return {${publicFunctions.join(', ')}};`);
    }

    sb.push(`// the end`);

    return sb.join('\n');
  } // main

  function emitGet(pred, arity)
  {
    const tn = termNames2(arity);
    const sb = [`
function get_${pred}(${tn.join(', ')})
{
    `];
    if (arity === 0)
    {
      sb.push(`return ${pred}_member;`);
    }
    else
    {
      const maps = [`${pred}_members`].concat(Array.from(Array(arity), (_, i) => "l" + i));
      for (let i = 0; i < arity; i++)
      {
        sb.push(`
        const ${maps[i+1]} = ${maps[i]}.get(t${i});
        if (${maps[i+1]} === undefined)
        {
          return null;
        }
        `)
      }
      sb.push(`return ${maps[arity]};`);
    }
    sb.push(`}`);
    return sb.join('\n');
  }

  function emitAddGet(pred, arity)
  {
    const tn = termNames2(arity);
    const sb = [`
function add_get_${pred}(${tn.join(', ')})
{
    `];

    if (arity === 0)
    {
      sb.push(`
        if (${pred}_member === null)
        {
          ${pred}_member = new ${pred}(${tn.join(', ')});
          ${logDebug(`\`addGet added ${pred}(${tn.map(t => `\${${t}}`)}) to members\``)}
        }
        return ${pred}_member;
        `);
    }
    else
    {
      function emitEntry(i)
      {
        if (i === arity)
        {
          return `tuple`;
        }
        return `new Map([[t${i}, ${emitEntry(i+1)}]])`;
      }
  
      const maps = [`${pred}_members`].concat(Array.from(Array(arity), (_, i) => "l" + i));
      for (let i = 0; i < arity; i++)
      {
        sb.push(`
        const ${maps[i+1]} = ${maps[i]}.get(t${i});
        if (${maps[i+1]} === undefined)
        {
          const tuple = new ${pred}(${tn.join(', ')});
          ${maps[i]}.set(t${i}, ${emitEntry(i+1)});
          ${logDebug(`\`addGet added ${pred}(${tn.map(t => `\${${t}}`)}) to members\``)}
          return tuple;
        }
        `)
      }
      sb.push(`return ${maps[arity]};`)  
    }
    sb.push(`}`);
    return sb.join('\n');
  }

  function emitAddGetExternal(pred, arity)
  {
    const tn = termNames2(arity);
    const sb = [`
function add_get_external_${pred}(tuple)
{
    `];

    if (arity === 0)
    {
      sb.push(`
        if (${pred}_member === null)
        {
          ${pred}_member = tuple;
          ${logDebug(`\`addGet added ${pred}(${tn.map(t => `\${${t}}`)}) to members\``)}
        }
        return ${pred}_member;
        `);
    }
    else
    {
      function emitEntry(i)
      {
        if (i === arity)
        {
          return `tuple`;
        }
        return `new Map([[tuple.t${i}, ${emitEntry(i+1)}]])`;
      }
  
      const maps = [`${pred}_members`].concat(Array.from(Array(arity), (_, i) => "l" + i));
      for (let i = 0; i < arity; i++)
      {
        sb.push(`
        const ${maps[i+1]} = ${maps[i]}.get(tuple.t${i});
        if (${maps[i+1]} === undefined)
        {
          ${maps[i]}.set(tuple.t${i}, ${emitEntry(i+1)});
          ${logDebug(`\`addGet added ${pred}(${tn.map(t => `\${tuple.${t}}`)}) to members\``)}
          return tuple;
        }
        `)
      }
      sb.push(`return ${maps[arity]};`)  
    }
    sb.push(`}`);
    return sb.join('\n');
  }

  // TODO this is the 'generic' tuples-as-map version, yet it doesn't handle 0-arity preds
  function emitAddGet2(name, rootMapName, numFields)
  {
    function emitEntry(i)
    {
      if (i === numFields)
      {
        return `entry`;
      }
      return `new Map([[t${i}, ${emitEntry(i+1)}]])`;
    }

    const tn = termNames2(numFields);
    const maps = [rootMapName].concat(Array.from(Array(numFields), (_, i) => "l" + i));
    const sb = [`
function addGet${name}(${tn.join(', ')})
{
    `];
    for (let i = 0; i < numFields; i++)
    {
      sb.push(`
      const ${maps[i+1]} = ${maps[i]}.get(t${i});
      if (${maps[i+1]} === undefined)
      {
        const entry = new ${name}(${tn.join(', ')});
        ${maps[i]}.set(t${i}, ${emitEntry(i+1)});
        return entry;
      }
      `)
    }
    sb.push(`
    return ${maps[numFields]};
}
    `);
    return sb.join('\n');
  }

  function emitRemove(pred, arity)
  {
    const tn = termNames2(arity);
    const sb = [`
function remove_${pred}(${tn.join(', ')})
{
    `];
    if (arity === 0)
    {
      sb.push(`${pred}_member === null;`);
    }
    else
    {
      const maps = [`${pred}_members`].concat(Array.from(Array(arity), (_, i) => "l" + i));
      for (let i = 0; i < arity-1; i++)
      {
        sb.push(`
        const ${maps[i+1]} = ${maps[i]}.get(t${i});
        `)
      }
      sb.push(`
      ${maps[arity - 1]}.set(t${arity-1}, undefined);`);  
    }
    sb.push(logDebug(`\`removed ${pred}(${tn.map(t => `\${${t}}`)}) from members\``));
    sb.push(`}`);
    return sb.join('\n');
  }

  function emitSelect(pred, arity)
  {
    if (arity === 0)
    {
      // TODO: this returns iterable(?), not iterator (as when arity > 0)
      return `
      function select_${pred}()
      {
          return ${pred}_member === null ? [] : [${pred}_member];
      }
          `;      
    }


    const maps = [`${pred}_members`].concat(Array.from(Array(arity), (_, i) => "l" + i));

    function emitLookup(i)
    {
      if (i === arity)
      {
        return `yield ${maps[arity]}`;
      }
      return `
        for (const ${maps[i+1]} of ${maps[i]}.values())
        {
          if (${maps[i+1]} !== undefined)
          {
            ${emitLookup(i+1)}
          }
        }
        `;
    }
    
    // iterator
    return `
function* select_${pred}()
{
    ${emitLookup(0)}
}
    `;
  }



function emitTupleObject(pred)
{
  const tn = termNames(pred);
  const termAssignments = tn.map(t => `this.${t} = ${t};`);
  const termFields = tn.map(t => `this.${t}`);
  const termEqualities = tn.map(t => `Object.is(member.${t}, ${t})`);
  const init = (pred.arity === 0 ? `let ${pred}_member = null` : `const ${pred}_members = new Map()`);

  let sb = `
${init};
${publicFunction(pred)}(${tn.join(', ')})
{
  ${termAssignments.join('\n  ')}
  this._inproducts = ${pred.edb ? `new Set(); //TODO will/should never be added to` : `new Set();`}
  this._outproducts = new Set();
  this._outproductsgb = new Set();
  this._refs = []; // TODO: can statically determine which preds will have refs (i.e., allocated as part of tuple) 
}
${pred}.prototype.toString = function () {return \`[${pred} ${termFields.map(tf => `\${${tf}}`).join(' ')}]\`};
${pred}.prototype.values = function () {return [${termFields}]};
${pred}.prototype.get = function () { // also internally used
  return get_${pred}(${termFields.join(', ')});
};
${pred}.prototype._remove = function () {
  remove_${pred}(${termFields.join(', ')});
};

${emitGet(`${pred}`, pred.arity)}
${emitAddGet(`${pred}`, pred.arity)}
${emitRemove(`${pred}`, pred.arity)}
${emitSelect(`${pred}`, pred.arity)}


`;

  if (pred.negAppearsIn.size > 0)
  {
    sb += `
const NOT_${pred}_members = new Map();
function NOT_${pred}(${tn.join(', ')})
{
  ${termAssignments.join('\n  ')}  
  this._inproducts = new Set(); // TODO: invariant: no inproducts?
  this._outproducts = new Set();
}        
NOT_${pred}.prototype.toString = function () {return atomString("!${pred}", ${termFields.join(', ')})};  
NOT_${pred}.prototype._remove = function () {
  remove_NOT_${pred}(${termFields.join(', ')});
};


${emitGet(`NOT_${pred}`, pred.arity)}
${emitAddGet(`NOT_${pred}`, pred.arity)}
${emitRemove(`NOT_${pred}`, pred.arity)}
    `;
  }

  return sb;
}

function emitFunctorObject(functor)
{
  const tn = termNames(functor);
  const termAssignments = tn.map(t => `this.${t} = ${t};`);
  const termFields = tn.map(t => `this.${t}`);
  const termEqualities = tn.map(t => `Object.is(member.${t}, ${t})`);
  const init = (functor.arity === 0 ? `let ${functor}_member = null` : `const ${functor}_members = new Map()`);

  let sb = `
${init};
${publicFunction(functor)}(${tn.join(', ')})
{
  ${termAssignments.join('\n  ')}
  this._rc = 0;
  this._outproducts = new Set();
  this._outproductsgb = new Set();
  this._refs = [];
}
${functor}.prototype.toString = function () {return atomString("${functor}", ${termFields.join(', ')})};
${functor}.prototype.values = function () {return [${termFields}]};
${functor}.prototype._remove = function () {
  remove_${functor}(${termFields.join(', ')});
};

${emitGet(`${functor}`, functor.arity)}
${emitAddGet(`${functor}`, functor.arity)}
${emitRemove(`${functor}`, functor.arity)}
`;

  return sb;
}


function compileAtom(atom, target, compileEnv, bindings, conditions)
{
  // bindings: name -> {bindingEmit, card}

  atom.terms.forEach((term, i) =>
  {
    if (term instanceof Var)
    {
      if (term.name !== '_')
      {
        if (compileEnv.has(term.name))
        {
          conditions.push(`${target}.t${i} === ${nameEnc(term.name)}`);
          const localBinding = bindings.get(term.name);
          if (localBinding !== undefined)
          {
            // this var was already locally encountered, e.g. 2nd 'a' in [I a x a]
            localBinding[1]++; // increase cardinality
          }
        }
        else
        {
          bindings.set(term.name, [`const ${nameEnc(term.name)} = ${target}.t${i};`, 1]);
          compileEnv.add(term.name);
        }
      }
    }
    else if (term instanceof Lit)
    {
      conditions.push(`${target}.t${i} === ${termToString(term.value)}`);
    }
    else if (term instanceof Atom) // functor
    {
      conditions.push(`${target}.t${i} instanceof ${term.pred}`);
      compileAtom(term, `${target}.t${i}`, compileEnv, bindings, conditions);
    }
    else
    {
      throw new Error(`cannot handle ${term} of type ${term.constructor.name} in ${atom}`);
    }
  })
}


function compileCreateFunctor(functor, j, termAids, rcIncs)
{
  rcIncs.push(`functor${j}`);
  const termExps = functor.terms;
  termAids.push(`
  // functor ${functor}
  const functor${j} = add_get_${functor.pred}(${termExps.map((exp, jj) => compileExpression(exp, `_${j}_${jj}`, termAids, rcIncs)).join(', ')});
  `);
  return `functor${j}`;
}

function compileRuleFireBody(rule, head, body, i, compileEnv, ptuples, rcIncs)
{
  if (i === body.length)
  {
    const pred = head.pred;
    const t2ps = ptuples.map(tuple => `${tuple}._outproducts.add(product);`);
    // const termExps = [];
    const termAids = [];
    const fact = rule.tupleArity() === 0;

    const termExps = head.terms.map((exp, j) => compileExpression(exp, `_${j}`, termAids, rcIncs));

    if (fact)
    {
      return `
      // adding edb ${head}
      //// TERM AIDS
      ${termAids.join('\n')}
      //////////////
      const existing_${pred}_tuple = get_${pred}(${termExps.join(', ')});
      if (existing_${pred}_tuple === null)
      {
        const new_${pred}_tuple = add_get_${pred}(${termExps.join(', ')});
        newTuples.add(new_${pred}_tuple);
        ${rcIncs.map(x => `new_${pred}_tuple._refs.push(${x})`).join('\n        ')}
        ${rcIncs.map(x => `${x}._rc++;`).join('\n        ')}
      }
      `;
    }
    else // derived tuple: construct product, deal with provenance
    {
      const noRecursionConditions = ptuples.map(tuple => `${tuple} !== existing_${pred}_tuple`);

      return `
      // adding idb ${head}
      //// TERM AIDS
      ${termAids.join('\n')}
      //////////////
      const existing_${pred}_tuple = get_${pred}(${termExps.join(', ')});
      if (existing_${pred}_tuple === null)
      {
        const new_${pred}_tuple = add_get_${pred}(${termExps.join(', ')});
        newTuples.add(new_${pred}_tuple);
        const product = addGetRule${rule._id}Product(${ptuples.join(', ')});
        ${t2ps.join('\n        ')}
        product._outtuple = new_${pred}_tuple;
        new_${pred}_tuple._inproducts.add(product);
        ${rcIncs.map(x => `new_${pred}_tuple._refs.push(${x})`).join('\n        ')}
        ${rcIncs.map(x => `${x}._rc++;`).join('\n        ')}
      }
      else if (${noRecursionConditions.join(' && ')}) // remove direct recursion in product
      {
        const product = addGetRule${rule._id}Product(${ptuples.join(', ')});
        ${t2ps.join('\n        ')}
        product._outtuple = existing_${pred}_tuple;
        existing_${pred}_tuple._inproducts.add(product);
      }      
    `;
    }

  }


  const atom = body[i];

  if (atom instanceof Atom)
  {
    const tuple = "tuple" + i;
    ptuples.push(tuple);
    const pred = atom.pred;
    const bindings = new Map();
    const conditions = [];


    
    switch (pred)
    {
      default:
        {
          compileAtom(atom, tuple, compileEnv, bindings, conditions);

          const preConditionBindings = [];
          const postConditionBindings = [];

          for (const [binding, card] of bindings.values())
          {
            if (card === 1)
            {
              postConditionBindings.push(binding);
            }
            else
            {
              preConditionBindings.push(binding);
            }
          }

          if (conditions.length === 0)
          {
            return `
            // atom ${atom} (no conditions)
            for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : select_${pred}()))
            {
              ${postConditionBindings.join('\n        ')}
              ${compileRuleFireBody(rule, head, body, i+1, compileEnv, ptuples, rcIncs)}
            }
            `;  
          }
          else
          {
            return `
            // atom ${atom} (conditions)
            for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : select_${pred}()))
            {
              ${preConditionBindings.join('\n        ')}
              if (${conditions.join(' && ')})
              {
                ${postConditionBindings.join('\n          ')}
                ${compileRuleFireBody(rule, head, body, i+1, compileEnv, ptuples, rcIncs)}
              }
            }
            `;  
          }      
        }
    }
  }

  if (atom instanceof Neg)
  {
    return compileNegAtom(atom, i, ptuples, compileEnv, rule, head, body, rcIncs);  
  }


  if (atom instanceof App)
  {
    return compileApplicationAtom(atom, rule, head, body, i, compileEnv, ptuples, rcIncs, compileRuleFireBody);
  }

  if (atom instanceof Assign)
  {
    return compileAssignmentAtom(atom, compileEnv, rule, head, body, i, ptuples, rcIncs, compileRuleFireBody);
  }

  if (atom instanceof Lit)
  {
    return compileLitAtom(atom, compileEnv, rule, head, body, i, ptuples, rcIncs, compileRuleFireBody);
  }

  throw new Error(`cannot handle ${body[i]} of type ${body[i].constructor.name} in ${rule}`);
}

  function compileNegAtom(atom, i, ptuples, compileEnv, rule, head, body, rcIncs)
  {
    const natom = atom.atom;
    const tuple = "tuple" + i;
    ptuples.push('NOT_' + tuple);
    const pred = natom.pred;
    const getValues = [];
    natom.terms.forEach((term, i) => {
      if (term instanceof Var) {
        if (compileEnv.has(term.name)) {
          getValues.push(`${nameEnc(term.name)}`);
        }

        else {
          throw new Error(`unbound variable ${term.name} in negation in ${rule}`);
        }
      }
      else if (term instanceof Lit) {
        getValues.push(`${termToString(term.value)}`);
      }

      else {
        throw new Error();
      }
    });

    return `
    // atom ${atom} (conditions)
    if (get_${pred}(${getValues.join(', ')}) !== null)
    {
      continue;
    }
    const NOT_${tuple} = add_get_NOT_${pred}(${natom.terms.map(t => nameEnc(t.name)).join(', ')});
    ${compileRuleFireBody(rule, head, body, i + 1, compileEnv, ptuples, rcIncs)}
    `;
  }

  function compileApplicationAtom(atom, rule, head, body, i, compileEnv, ptuples, rcIncs, cont) 
  {
    const appC = compileApplication(atom);
    return `
        // application ${atom}
        if ((${appC}) !== false)
        {
          ${cont(rule, head, body, i + 1, compileEnv, ptuples, rcIncs)}
        } // application ${atom}
    `;
  }

  function compileAssignmentAtom(atom, compileEnv, rule, head, body, i, ptuples, rcIncs, cont)
  {
    const op = atom.operator;
    const name = atom.left;
    const right = atom.right;

    assertTrue(op === ':=');
    assertTrue(name instanceof Var);

    if (compileEnv.has(name))
    {
      throw new RspJsCompilationError(`assigning bound name '${name}'`);
    }
    compileEnv.add(name);
    const nameC = compileExpression(name); // too broad
    const rightC = compileExpression(right);
    return `
      // assign ${atom}
      const ${nameC} = ${rightC};

      ${cont(rule, head, body, i + 1, compileEnv, ptuples, rcIncs)}
    `;
  }

  function compileLitAtom(atom, compileEnv, rule, head, body, i, ptuples, rcIncs, cont)
  {
    const litC = compileExpression(atom);
    return `
        // literal ${atom}
        if ((${litC}) !== false)
        {
          ${cont(rule, head, body, i + 1, compileEnv, ptuples, rcIncs)}
        } // literal ${atom}
    `;
  }

function emitRule(rule)
{
  const compileEnv = new Set();

  const tupleArity = rule.tupleArity();
  const tupleParams = Array.from({length:tupleArity}, (_, i) => `tuple${i}`);
  const tupleFieldInits = Array.from(tupleParams, tp => `this.${tp} = ${tp};`);
  const tupleFields = Array.from(tupleParams, tp => `this.${tp}`);
  const recursive = analysis.ruleIsRecursive(rule);

  return `
/* rule (tuple arity ${tupleArity}) (${recursive ? 'recursive' : 'non-recursive'}) (non-aggregating)
${rule} 
*/

class Rule${rule._id}Product
{
  constructor(${tupleParams.join(', ')})
  {
    ${tupleFieldInits.join('\n')}
    this._outtuple = null; // TODO make this ctr param!
  }

  // result of a recursive rule?
  recursive()
  {
    return ${recursive};
  }

  tuples() // or, a field initialized in ctr?
  {
    return [${tupleFields.join(', ')}];
  }

  toString()
  {
    return "r${rule._id}:" + this.tuples().join('.');
  }
}

const Rule${rule._id}Products = new Map();
${emitAddGet2(`Rule${rule._id}Product`, `Rule${rule._id}Products`, tupleArity)}
// TODO: Product removal!

function fireRule${rule._id}(deltaPos, deltaTuples)
{
  ${logDebug(`'fire ${rule}'`)}
  ${logDebug('`deltaPos ${deltaPos} deltaTuples ${[...deltaTuples].join()}`')}

  ${profileStart(`fireRule${rule._id}`)}

  const newTuples = new Set();

  ${compileRuleFireBody(rule, rule.head, rule.body, 0, compileEnv, [], [])}

  ${profileEnd(`fireRule${rule._id}`)}

  ${logDebug('`=> newTuples ${[...newTuples].join()}`')}

  return newTuples;
} // end fireRule${rule._id}
  `;
}

function compileRuleGBFireBody(rule, head, body, i, compileEnv, ptuples) // TODO contains cloned code from `compileRule`
{
  if (i === body.length)
  {
    const agg = head.terms[head.terms.length - 1];
    assertTrue(agg instanceof Agg);
    const aggregate = agg.aggregate;
    const gb = head.terms.slice(0, head.terms.length - 1);
    const t2ps = ptuples.map(tuple => `${tuple}._outproductsgb.add(productGB);`);
    return `
      // updates for ${head}
      const productGB = addGetRule${rule._id}ProductGB(${ptuples.join()});
      const groupby = add_get_Rule${rule._id}GB(${gb.map(t => nameEnc(t.name)).join()});

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        productGB.value = ${nameEnc(aggregate.name)}; // TODO: aggregate is func dep on tuples, arrange this in another way (e.g. set in ctr)?
        productGB._outgb = groupby;
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [${nameEnc(aggregate.name)}]);
        }
        else
        {
          currentAdditionalValues.push(${nameEnc(aggregate.name)});
        }
        ${t2ps.join('\n        ')}
      }
`;
  }


  const atom = body[i];

  if (atom instanceof Atom)
  {
    const tuple = "tuple" + i;
    ptuples.push(tuple);
    const pred = atom.pred;
    const bindUnboundVars = [];
    const conditions = [];
    atom.terms.forEach((term, i) => {
      if (term instanceof Var)
      {
        if (compileEnv.has(term.name))
        {
          conditions.push(`${tuple}.t${i} === ${nameEnc(term.name)}`);
        }
        else
        {
          bindUnboundVars.push(`const ${nameEnc(term.name)} = ${tuple}.t${i};`);
          compileEnv.add(term.name);
        }
      }
      else if (term instanceof Lit)
      {
        conditions.push(`${tuple}.t${i} === ${termToString(term.value)}`);
      }
      else
      {
        throw new Error();
      }
    });

    if (conditions.length === 0)
    {
      return `
      // atom ${atom} [no conditions]
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : select_${pred}()))
      {
        ${bindUnboundVars.join('\n        ')}
        ${compileRuleGBFireBody(rule, head, body, i+1, compileEnv, ptuples)}
      }
      `;  
    }
    else
    {
      return `
      // atom ${atom} [conditions]
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : select_${pred}()))
      {
        if (${conditions.join('&&')})
        {
          ${bindUnboundVars.join('\n        ')}
          ${compileRuleGBFireBody(rule, head, body, i+1, compileEnv, ptuples)}
        }
      }
      `;  
    }
  }

  if (atom instanceof App)
  {
    return compileApplicationAtom(atom, rule, head, body, i, compileEnv, ptuples, null /*rcIncs*/, compileRuleGBFireBody);
  }

  if (atom instanceof Assign)
  {
    return compileAssignmentAtom(atom, compileEnv, rule, head, body, i, ptuples, null /*rcIncs*/, compileRuleGBFireBody);
  }

  throw new Error(body[i]);
}

function emitRuleGB(rule)
{
  const tupleArity = rule.tupleArity();
  const tupleParams = Array.from({length:tupleArity}, (_, i) => `tuple${i}`);
  const tupleFieldInits = Array.from(tupleParams, tp => `this.${tp} = ${tp};`);
  const tupleFields = Array.from(tupleParams, tp => `this.${tp}`);

  const pred = rule.head.pred;
  const compileEnv = new Set();

  const numGbTerms = rule.head.terms.length - 1;
  const tn = Array.from(Array(numGbTerms), (_, i) => "t" + i);
  const termAssignments = tn.map(t => `this.${t} = ${t}`);
  const termToStrings = tn.map(t => `this.${t}`);
  const aggTerm = rule.head.terms[rule.head.terms.length - 1];


  const recursive = analysis.ruleIsRecursive(rule);
  if (recursive)
  {
    throw new Error(`${rule}: aggregating rules must not be recursive`);
  }

  return `
/* rule (tuple arity ${tupleArity}) (non-recursive) (aggregating) 
${rule} 
*/

class Rule${rule._id}GB
{
  constructor(${tn.join(', ')})
  {
    ${termAssignments.join('; ')};
    this._outtuple = null;  
  }

  toString()
  {
    return atomString('${rule.head.pred}', ${termToStrings.join(', ')}, ({toString: () => "${aggTerm}"}));
  }
}

const Rule${rule._id}GB_members = new Map();
${emitAddGet(`Rule${rule._id}GB`, numGbTerms)}

class Rule${rule._id}ProductGB
{
  constructor(${tupleParams.join(', ')})
  {
    ${tupleFieldInits.join('\n    ')}
    this.value = null; // TODO ctr param? (is func dep on tuples + complicates addGet)
    this._outgb = null;  // TODO ctr param? (complicates addGet)
  }

  tuples() // or, a field initialized in ctr?
  {
    return [${tupleFields.join(', ')}];
  }

  toString()
  {
    return "r${rule._id}:" + this.tuples().join('.');
  }
}

const Rule${rule._id}ProductGBs = new Map();
${emitAddGet2(`Rule${rule._id}ProductGB`, `Rule${rule._id}ProductGBs`, tupleArity)}
// TODO: Product removal!

function fireRule${rule._id}GB(deltaPos, deltaTuples, updates)
{
  ${logDebug(`"fire ${rule}"`)}
  ${logDebug('`deltaPos ${deltaPos} deltaTuples ${[...deltaTuples].join()}`')}

  ${profileStart(`fireRule${rule._id}GB`)}

  const newTuples = new Set();

  ${compileRuleGBFireBody(rule, rule.head, rule.body, 0, compileEnv, [])}
  
  ${profileEnd(`fireRule${rule._id}GB`)}

  ${logDebug('`=> current updates: ${[...updates.entries()].join(", ")}`')}
} // end fireRule${rule._id}GB
  `;
}

function emitIterators(preds, edbPreds, rules)
{
  const tupleYielders = preds.map(pred => `yield* select_${pred}()`);
  const edbTupleYielders = edbPreds.map(pred => `yield* select_${pred}()`);
  // const gbYielders = rules.flatMap((rule, i) => rule.aggregates() ? [`//yield* Rule${rule._id}GB.members;`] : []);

  return `
// from membership
${publicFunctionStar('tuples')}() 
{
  ${tupleYielders.join('\n  ')}
}

${publicFunctionStar('rootTuples')}()   // all EDBs and IDB facts
{
  // expensive impl: alternative would be to keep set of externally added EDBs and all IDB facts
  // but, this is cheap as long as reachability stuff (tracing) is not required
  for (const tuple of tuples())
  {
    if (tuple._inproducts.size === 0)
    {
      yield tuple;
    }
  }
}

`;
}

function emitClear(edbPreds)
{
  const clearers = edbPreds.map(edbPred => `removeTuples(select_${edbPred}());`);

  return `
${publicFunction('clear')}()
{
  ${clearers.join('\n')}
}  
  `;
}

function compileExpression(exp, j, termAids, rcIncs)
{
  if (exp instanceof Var)
  {
    if (isNativeFunName(exp.name))
    {
      return requiredBuiltInFunDefs.add(exp.name);
    }
    return nameEnc(exp.name);
  }
  if (exp instanceof Lit)
  {
    if (exp.value === true)
    {
      return 'true';
    }
    if (exp.value === false)
    {
      return 'false';
    }
    return String(exp);
  }
  if (exp instanceof App)
  {
    return compileApplication(exp);
  }
  if (exp instanceof Atom) // Functor
  {
    return compileCreateFunctor(exp, j, termAids, rcIncs);
  }
  throw new Error(`cannot handle expression ${exp} of type ${exp.constructor.name}`);
}


function compileApplication(app)
{

  function compileRatorRands(i)
  {
    if (i === rands.length - 2)
    {
      return `${compileExpression(rands[i])} ${rator.name} ${compileExpression(rands[i+1])}`;
    }
    return `${compileExpression(rands[0])} ${rator.name} ${compileRatorRands(i+1)}`;
  }



  const rator = app.operator;
  const rands = app.operands;
  if (rator instanceof Var)
  {
    if (rator.name === "=") 
    {
      return `${compileExpression(rands[0])} === ${compileExpression(rands[1])}`;
    }
    
    if (rator.name === "!=") 
    {
      return `${compileExpression(rands[0])} !== ${compileExpression(rands[1])}`;
    }
    
    if (rator.name === ">" || rator.name === ">=" || rator.name === "<" || rator.name === "<=")
    {
      return `${compileExpression(rands[0])} ${rator.name} ${compileExpression(rands[1])}`;
    }

    if (rator.name === "+" || rator.name === "-") 
    {
      if (rands.length === 1)
      {
        return `${compileExpression(app.operands[0])}`; // ignore + (?)
      }
      if (rands.length > 1)
      {
        return rands.map(compileExpression).map(e => `(${e})`).join(rator.name);
      }
    }

    if (rator.name === "*" || rator.name === "/") 
    {
      if (rands.length > 1)
      {
        return rands.map(compileExpression).map(e => `(${e})`).join(rator.name);
      }
    }
    
    if (rator.name === "not")
    {
      return `!${compileExpression(rands[0])}`;
    }

    if (rator.name === "even?")
    {
      return `(${compileExpression(rands[0])}) % 2 === 0`;
    }

    if (rator.name === "odd?")
    {
      return `(${compileExpression(rands[0])}) % 2 === 1`;
    }
  }
  return `(${compileExpression(rator)})(${rands.map(compileExpression).join(', ')})`;
}

function emitEdbAtom(atom, i, rule, producesPred, stratum)
{

  if (atom instanceof Atom)
  {
    const pred = atom.pred;
    if (!stratum.isStratumPredName(atom.pred)) // non-stratum = edb, because of toposort
    {
      if (rule.aggregates())
      {
        return [`
        // atom ${i} ${atom} (edb) (aggregating)
        if (added_${pred}_tuples.length > 0)
        {
          fireRule${rule._id}GB(${i}, added_${pred}_tuples, updates${rule._id});
        }
      `];  
      }
      return [`
      // atom ${i} ${atom} (edb) (non-aggregating)
      if (added_${pred}_tuples.length > 0)
      {
        const Rule${rule._id}_tuples${i} = fireRule${rule._id}(${i}, added_${pred}_tuples);
        MutableArrays.addAll(added_${producesPred}_tuples, Rule${rule._id}_tuples${i});  
      }
    `];
    }
  }
  else if (atom instanceof Neg)
  {
    const pred = atom.atom.pred; // always stratum-edb
    return [`
    // atom ${i} ${atom} (edb)
    if (removed_${pred}_tuples.length > 0)
    {
      const Rule${rule._id}_tuples${i} = fireRule${rule._id}(${i}, removed_${pred}_tuples); // TODO inefficient: does full scan in lrnu
      MutableArrays.addAll(added_${producesPred}_tuples, Rule${rule._id}_tuples${i});  
    }
  `];
  }
  return [];
}

function emitDeltaEdbForRule(rule, stratum)
{
  const producesPred = rule.head.pred;
  const atoms = rule.body.flatMap((atom, i) => emitEdbAtom(atom, i, rule, producesPred, stratum));

  return `
    /* Rule${rule._id} (non-aggregating)
${rule}
    */
    ${atoms.join('\n    ')}
  `;
}

function emitDeltaEdbForAggregatingRule(rule, stratum)
{
  const pred = rule.head.pred;
  const atoms = rule.body.flatMap((atom, i) => emitEdbAtom(atom, i, rule, pred, stratum));
  const gbNames = Array.from({length: rule.head.terms.length - 1}, (_, i) => "groupby.t"+i);

  const aggregateName ="t" + (rule.head.terms.length - 1);  
  const aggregator = rule.head.terms[rule.head.terms.length - 1].aggregator;
  let joinOperation; // join semilattice
  let addOperation, identityValue; // commutative group
  switch (aggregator)
  {
    case "max": joinOperation = "Math.max(acc, val)"; break;
    case "min": joinOperation = "Math.min(acc, val)"; break;
    case "sum": addOperation = "acc + val"; identityValue = 0; break;
    case "count": addOperation = "acc + 1"; identityValue = 0; break;
    default: throw new Error("Unknown aggregator: " + aggregator);
  }

  let updateOperation;
  if (joinOperation)
  {
    updateOperation = `currentResultTuple === null ? additionalValues.reduce((acc, val) => ${joinOperation}) : additionalValues.reduce((acc, val) => ${joinOperation}, currentResultTuple.${aggregateName})`
  }
  else if (addOperation)
  {
    updateOperation = `currentResultTuple === null ? additionalValues.reduce((acc, val) => ${addOperation}, ${identityValue}) : additionalValues.reduce((acc, val) => ${addOperation}, currentResultTuple.${aggregateName})`
  }
  else
  {
    throw new Error("No update operation for aggregator: " + aggregator)
  }

  return `
    /* Rule${rule._id} (aggregating)
${rule}
    */

    const updates${rule._id} = new Map(); // groupby -> additional values

    ${atoms.join('\n    ')}

    // bind head ${rule.head}
    for (const [groupby, additionalValues] of updates${rule._id})
    {
      ${logDebug('`update: gb ${groupby} additional vals ${additionalValues}`')}
      const currentResultTuple = groupby._outtuple;
      ${logDebug('`currentResultTuple ${currentResultTuple}`')}
      const updatedValue = ${updateOperation};
      const updatedResultTuple = add_get_${pred}(${gbNames.join()}, updatedValue);  
      ${logDebug('`updatedResultTuple ${updatedResultTuple}`')}
      if (groupby._outtuple !== updatedResultTuple)
      {
        if (groupby._outtuple !== null)
        { 
          deltaRemove_${pred}(groupby._outtuple);
        }
        groupby._outtuple = updatedResultTuple;
        updatedResultTuple.ingb = groupby;
        added_${pred}_tuples.push(updatedResultTuple);
      }
    }
  `;
}

function emitRecursiveRuleAtom(atom, i, recursivePreds, rule, producesPred)
{
  if (atom instanceof Atom)
  {
    const pred = atom.pred;
    if (recursivePreds.has(pred))
    {
      return [`
        const ${producesPred}_tuples_${rule._id}_${i} = fireRule${rule._id}(${i}, local_${pred}_tuples);
        MutableArrays.addAll(new_${producesPred}_tuples, ${producesPred}_tuples_${rule._id}_${i});
        MutableArrays.addAll(added_${producesPred}_tuples, ${producesPred}_tuples_${rule._id}_${i}); // not reqd for rdb
      `];  
    }
    else
    {
      return [];
    }
  }
  return [];
}

function emitRecursiveRule(rule, recursivePreds)
{
  const producesPred = rule.head.pred;
  const atoms = rule.body.flatMap((atom, i) => emitRecursiveRuleAtom(atom, i, recursivePreds, rule, producesPred));
  return `
    /* Rule${rule._id} (recursive)
${rule}
    */
    ${atoms.join('\n    ')}
  `;
}

function emitRecursiveRules(rules, recursivePreds)
{
  const producedPreds = [...rules.reduce((acc, rule) => acc.add(rule.head.pred), new Set())];

  // TODO these locals profit only in first step from addition that occurs within loop (cascade, through shared ref to general delta set)
  const locals = producedPreds.map(pred => `
    let local_${pred}_tuples = added_${pred}_tuples;
  `);
  const news = producedPreds.map(pred => `
    const new_${pred}_tuples = [];
  `);
  const localConditions = producedPreds.map(pred => `local_${pred}_tuples.length > 0`);

  const fireRules = rules.map(rule => emitRecursiveRule(rule, recursivePreds));

  const transfers = producedPreds.map(pred => `
    local_${pred}_tuples = new_${pred}_tuples;
  `);

  return `
    // recursive rules: ${rules.map(rule => "Rule" + rule._id).join(', ')}
    // produce: ${producedPreds}

    ${locals.join('\n')}
    while (${localConditions.join(' || ')})
    {
      ${news.join('\n    ')}
      ${fireRules.join('\n    ')}
  
      ${transfers.join('')}
    }
  `;
}

function termNames(pred)
{
  return Array.from(Array(pred.arity), (_, i) => "t" + i);
}

function termNames2(arity)
{
  return Array.from(Array(arity), (_, i) => "t" + i);
}

function termToString(x)
{
  if (typeof x === 'string')
  {
    return `'${x}'`;
  }
  return String(x); // ???
}


function emitDeltaAddTuple(pred)
{
  const tn = termNames(pred);
  const termProperties = Array.from(Array(pred.arity), (_, i) => `proposed.t${i+1}`);
  return `

${emitAddGetExternal(pred, pred.arity)}
function delta_add_${pred}_tuples(proposedEdbTuples)
{
  const ${pred}_tuples = [];
  for (const proposed of proposedEdbTuples)
  {
    const actual = add_get_external_${pred}(proposed);
    if (actual === proposed) // freshly added
    {
      ${pred}_tuples.push(actual);
    }
  }
  return ${pred}_tuples;
}
  `
}

function stratumLogic(stratum)
{
  const globalEdbStratum = analysis.stratumIsEdb(stratum);

  const sb = [`
    ${logDebug(`"=== stratum ${stratum}"`)}
    // stratum ${stratum.id} ${globalEdbStratum ? `(global edb)` : `(global idb)`}
    // preds: ${stratum.preds.join(', ')}
    // non-recursive rules: ${[...stratum.nonRecursiveRules].map(rule => "Rule" + rule._id)}
    // recursive rules: ${[...stratum.recursiveRules].map(rule => "Rule" + rule._id)}  
    `];


  if (globalEdbStratum)
  {
    for (const pred of stratum.preds)
    {
      assertTrue(pred.edb);
      sb.push(emitDeltaRemoveTuple(pred));
      if (pred.negAppearsIn.size > 0)
      {
        sb.push(emitDeltaRemoveNOTTuple(pred));
      }

      sb.push(`

      // removing ${pred} tuples because of user delta
      const ${pred}_tuples_to_be_removed = (removedTuplesMap.get(${pred}) || []);
      for (const ${pred}_tuple of ${pred}_tuples_to_be_removed)
      {
        deltaRemove_${pred}(${pred}_tuple);
      }
      
      // adding ${pred} tuples because of user delta
      const added_${pred}_tuples = delta_add_${pred}_tuples(addedTuplesMap.get(${pred}) || []);
      `);  
    }      
  }
  else // global idb stratum
  {

    if (analysis.stratumHasRecursiveRule(stratum))
    {
      sb.push(`// stratum has recursive rules`);
      if (!stratum.preds.every(pred => analysis.predHasRecursiveRule(pred)))
      {
        stratum.preds.forEach(pred =>
        {
          console.log(`${pred} has recursive rule: ${analysis.predHasRecursiveRule(pred)}`);
        })
      }
      
      assertTrue(stratum.preds.every(pred => analysis.predHasRecursiveRule(pred)));

      if (stratum.preds.length > 1)
      {
        const removeLoopCondition = stratum.preds.map(pred => `damaged_${pred}_tuples.length > 0`).join(' || ');
        sb.push(`
        while (${removeLoopCondition})
        {`);  
      }

      for (const pred of stratum.preds)
      {
        const removalCondition = analysis.predHasNonRecursiveRule
          ? `damaged_${pred}_tuple._inproducts.size === 0 || !tupleIsGrounded(damaged_${pred}_tuple)`
          : `damaged_${pred}_tuple._inproducts.size === 0)`; // a "fully recursive" never by itself will have incoming non-recursive products,
          // so its groundedness always depends on other tuples (with incoming non-rec products)
        sb.push(`
        ${logDebug(`\`removing \${damaged_${pred}_tuples.length} damaged ${pred} tuples due to removal of other tuples\``)}
        while (damaged_${pred}_tuples.length > 0)
        {
          const damaged_${pred}_tuple = damaged_${pred}_tuples.pop();
          if (${removalCondition})
          {
            deltaRemove_${pred}(damaged_${pred}_tuple);
          }  
        }
        `)
      }

      if (stratum.preds.length > 1)
      {
        sb.push(`
        }`)
      }
    }
    else // single-pred non-recursive stratum
    {
      sb.push(`// single-pred non-recursive stratum`);
      assertTrue(stratum.preds.length === 1);
      const pred = stratum.preds[0];
      sb.push(`
      ${logDebug(`"removing damaged ${pred} tuples due to removal of stratum-edb tuples"`)}
      for (const damaged_${pred}_tuple of damaged_${pred}_tuples)
      {
        if (damaged_${pred}_tuple._inproducts.size === 0)
        {
          deltaRemove_${pred}(damaged_${pred}_tuple);
        }
      }
      `);
    }
     
    for (const pred of stratum.preds)
    {
      // sb.push(`const added_${pred}_tuples = [];`);// not sufficient when you have facts for recursive idb preds
      sb.push(`const added_${pred}_tuples = addedTuplesMap.get(${pred})?.slice(0) ?? [];`); // `slice` for copying (need to keep original facts) TODO optimize by emitting only `[]` when no fact rules exist

      sb.push(logDebug('"adding idb tuples due to stratum-edb addition by firing all non-recursive rules"')); // TODO could maybe fire *all* rules (rec + non-rec) already once?
      for (const rule of pred.rules) // TODO: check this: also fires rec rules (once)
      {
        if (rule.aggregates())
        {
          sb.push(emitDeltaEdbForAggregatingRule(rule, stratum));
        }
        else
        {
          sb.push(emitDeltaEdbForRule(rule, stratum));
        }
      }
    }
  
    if (stratum.recursiveRules.size > 0)
    {
      sb.push(logDebug('"adding idb tuples due to stratum-idb addition by firing recursive rules"')); 
      const recursiveRules = emitRecursiveRules([...stratum.recursiveRules], new Set(stratum.preds.map(pred => pred.name)));
      sb.push(recursiveRules);
    }

    for (const pred of stratum.preds)
    {
      sb.push(emitDeltaRemoveTuple(pred));
      if (pred.negAppearsIn.size > 0)
      {
        sb.push(emitDeltaRemoveNOTTuple(pred));

        const tn = termNames(pred);
        const fieldAccesses = tn.map(n => `added_${pred}_tuple.${n}`);    
        sb.push(`
        ${logDebug(`"removing idb tuples due to addition of ${pred} tuples"`)}
        for (const added_${pred}_tuple of added_${pred}_tuples)
        {
          const NOT_${pred}_tuple = get_NOT_${pred}(${fieldAccesses.join()});
          if (NOT_${pred}_tuple !== null)
          {
            deltaRemove_NOT_${pred}(NOT_${pred}_tuple);
          }
        }
        `);
      }
    }
    
  }

  return sb.join('\n');
}

function emitDeltaRemoveTuple(pred)
{
  const tns = termNames(pred);
  const rules = [...pred.posAppearsIn];
  const productRemoval = rules.map(r => `
        // rule ${r}
        if (outproduct instanceof Rule${r._id}Product)
        {
          ${Array.from({length:r.tupleArity()}, (_, i) => 
            `outproduct.tuple${i}._outproducts.delete(outproduct);`).join('\n            ')}
          const ${r.head.pred}_tuple = outproduct._outtuple;
          ${r.head.pred}_tuple._inproducts.delete(outproduct);
          damaged_${r.head.pred}_tuples.push(${r.head.pred}_tuple);
        }
  `);

  return `
  function deltaRemove_${pred}(${pred}_tuple)
  {
    remove_${pred}(${tns.map(tn => `${pred}_tuple.${tn}`).join(', ')});
    removed_${pred}_tuples.push(${pred}_tuple);
    for (const outproduct of ${pred}_tuple._outproducts)
    {
      ${productRemoval.join('  else')}
    }
    const refs = ${pred}_tuple._refs; // TODO check this statically (compile away when possible)
    if (refs.length > 0) 
    {
      for (let i = 0; i < refs.length; i++)
      {
        const rc = --refs[i]._rc;
        if (rc === 0)
        {
          refs[i]._remove();
        }
      }
    }
  }`;
}

function emitDeltaRemoveNOTTuple(pred)
{
  const tns = termNames(pred);
  const rules = [...pred.negAppearsIn];
  const productRemoval = rules.map(r => `
        // rule ${r}
        if (outproduct instanceof Rule${r._id}Product)
        {
          ${Array.from({length:r.tupleArity()}, (_, i) => 
            `outproduct.tuple${i}._outproducts.delete(outproduct);`).join('\n            ')}
          const ${r.head.pred}_tuple = outproduct._outtuple;
          ${r.head.pred}_tuple._inproducts.delete(outproduct);
          damaged_${r.head.pred}_tuples.push(${r.head.pred}_tuple);
        }
  `);

  return `
  function deltaRemove_NOT_${pred}(NOT_${pred}_tuple)
  {
    remove_NOT_${pred}(${tns.map(tn => `NOT_${pred}_tuple.${tn}`).join(', ')});
    // removed_NOT_${pred}_tuples.push(NOT_${pred}_tuple); // TODO is this ever used?
    for (const outproduct of NOT_${pred}_tuple._outproducts)
    {
      ${productRemoval.join('  else')}
    }
  }`;
}

function emitComputeDelta(strata, preds) 
{
  const deltaAddedTuplesEntries = preds.map(pred => `[${pred}, added_${pred}_tuples]`);
  const deltaRemovedTuplesEntries = preds.map(pred => `[${pred}, removed_${pred}_tuples]`);

  return `
function computeDelta(addTuples, remTuples)
{
  const addedTuplesMap = new Map(addTuples);
  const removedTuplesMap = new Map(remTuples);
  ${logDebug('"addedTupleMap " + [...addedTuplesMap.values()]')}
  ${logDebug('"removedTupleMap " + [...removedTuplesMap.values()]')}

  ${preds
    .filter(pred => !pred.edb) 
    .map(pred => `const damaged_${pred}_tuples = [];`)
    .join('\n  ')
  }

  ${preds
    .map(pred => `const removed_${pred}_tuples = [];`)
    .join('\n  ')
  }


  ${strata.map(stratumLogic).join('\n')}
  
  ${logDebug('"=== done"')}
  return {
    added() {return [${[...deltaAddedTuplesEntries]}]},
    removed() {return [${[...deltaRemovedTuplesEntries]}]}
    }
} // computeDelta
`;
}

function emitRemoveTuples(strata)
{
  return `


function tupleIsGrounded(tuple)
{
  const seen = new Set();
  const groundedCache = new Set(); // TODO: can we make this more global/incremental?
                                    // now gets 'cleared' on every recursive check (see factorial example)

  function groundedTuple(tuple)
  {

    // with recursive rules it's possible that the same grounded tuple is encountered when moving up the prov tree:
    // therefore, cache known grounded tuples, and only declare cycle for re-encountered non-cached tuples 
    if (groundedCache.has(tuple))
    {
      ${logDebug('`${tuple} grounded: in cache`')}
      return true;
    }

    if (seen.has(tuple))
    {
      ${logDebug('`${tuple} not grounded: cycle`')}
      return false;
    }
    seen.add(tuple);

    if (tuple._inproducts.size === 0)
    {
      ${logDebug('`${tuple} grounded: no inproducts`')}
      groundedCache.add(tuple);
      return true;
    }
    for (const inproduct of tuple._inproducts)
    {
      if (!inproduct.recursive())
      {
        // known to be grounded because of incoming product from lower stratum
        ${logDebug('`${tuple} grounded because of non-recursive product ${inproduct}`')}
        groundedCache.add(tuple);
        return true;
      }
      if (groundedProduct(inproduct))
      {
        ${logDebug('`${tuple} grounded because of product ${inproduct}`')}
        groundedCache.add(tuple);
        return true;
      }
    }  
    ${logDebug('`${tuple} not grounded: has no grounded products`')}
    return false;
  }

  function groundedProduct(product)
  {
    for (const tuple of product.tuples())
    {
      if (!groundedTuple(tuple))
      {
        return false;
      }
    }
    return true;
  }

  ${logDebug('`is ${tuple} grounded? ...`')}
  const isGrounded = groundedTuple(tuple);
  ${logDebug('`... ${tuple} is ${isGrounded ? "" : "not "}grounded`')}
  return isGrounded;
}
`;
}

function emitFirst()
{
  return `

//const IMM_EMPTY_COLLECTION = Object.freeze([]);

const MutableArrays =
{
  addAll(x, y)
  {
    ${assert('Array.isArray(x)', 'x')}
    for (const elem of y)
    {
      x.push(elem);
    }
  }
}

const MutableSets =
{
  addAll(x, y)
  {
    for (const elem of y)
    {
      x.add(elem);
    }
  }
}

function atomString(predicateName, ...termValues)
{
  return '[' + predicateName + ' ' + termValues.map(termString).join(' ') + ']';
}

function termString(termValue)
{
  if (typeof termValue === "string")
  {
    return "'" + termValue + "'";
  }

  return String(termValue);
}


function toTupleMap(tuples)
{
  const map = new Map();

  function add(tuple)
  {
    const key = tuple.constructor;
    const currentValue = map.get(key);
    if (currentValue === undefined)
    {
      map.set(key, [tuple]);
    }
    else
    {
      currentValue.push(tuple);
    }
  }
  [...tuples].forEach(add);
  return map;
}

${publicFunction('addTupleMap')}(addTuples)
{
  return computeDelta(addTuples, []);
}

${publicFunction('addTuples')}(edbTuples)
{
  return addTupleMap(toTupleMap(edbTuples));
}

${publicFunction('getTuple')}(tuple)
{
  return tuple.get();
}

${publicFunction('removeTupleMap')}(remTuples)
{
  return computeDelta([], remTuples);
} 

${publicFunction('removeTuples')}(edbTuples)
{
  return removeTupleMap(toTupleMap(edbTuples));
}
`} // emitFirst

  function emitProfileResults()
  {
    const vars = profileVars.names().map(name => `${name}`);
    return `    
${publicFunction('profileResults')}()
{
  return { ${vars.join()}, ${rules.map(r => `Rule${r._id}:'${r.toString()}'`)} };
}
    `;
  }

  return main();

} // end compile

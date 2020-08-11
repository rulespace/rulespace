import fs from 'fs';
import { assertTrue, Sets } from './common.mjs';
import { parseProgram, Var, Atom, Bin, Assign } from './parser.mjs';
import { analyzeProgram } from './analyzer.mjs';

export function compileFile(name)
{
  const compiled = compile(fs.readFileSync(`${name}.js`, 'utf8'));
  fs.writeFileSync(`${name}.mjs`, compiled, 'utf8');
}

export function compile(src)
{
  const program = parseProgram(src);

  const staticInfo = analyzeProgram(program);
  console.log(staticInfo);

  const sb = [];

  sb.push(emitImports);

  for (const [pred, arity] of staticInfo.predicates.entries())
  {
    sb.push(emitTupleClass(pred, arity));
  }

  program.rules.forEach((rule, i) =>
  {
    sb.push(emitRuleObject(rule, i));
  });
  
  sb.push(emitRest);

  return sb.join('\n');
}


function emitTupleClass(pred, arity)
{
  console.log(`emitTupleClass ${pred} ${arity}`);
  const termNames = Array.from(Array(arity), (_, i) => "t" + i);
  const termEqualities = termNames.map(t => `Object.is(member.${t}, ${t})`).join(' && ');
  const termAssignments = termNames.map(t => `this.${t} = ${t}`).join('; ');
  const termToStrings = termNames.map(t => `this.${t}`).join(', ');
  return `

export class ${pred}
{

  static members = [];
  _outproducts = new Set();

  constructor(${termNames})
  {
    for (const member of ${pred}.members)
    {
      if (${termEqualities})
      {
        return member;
      }
    }
    ${termAssignments};
    this._id = ${pred}.members.length;
    ${pred}.members.push(this);
  }

  toString()
  {
    return atomString('${pred}', ${termToStrings});
  }
}
  `;
}

function emitRuleAtomTermFire(termNumber, term, pred, compileEnv, wl)
{
  if (term instanceof Var)
  {
    const name = term.name;
    const bound = compileEnv.has(name);
    compileEnv.add(name);
    const comment = `// term ${termNumber} Var ${term} ${bound ? '[bound]' : '[unbound]'}`;
    if (bound)
    {
      return `
${comment}
const ${wl} = [];    
for (const tuple of (deltaPos === ${} ? deltaTuples : ${pred}.members))
{
  const ${name} = tuple.t${termNumber};
  const existingx = env.get('${name}');
  if (existingx === ${name})
  {
    ${wl}.push([env, tuple]);
  }
}
      `;
    }
    else
    {
      return `
${comment}
for (const tuple of (deltaPos === 0 ? deltaTuples : ${pred}.members))
{
  const ${name} = tuple.t${termNumber};
  ${wl}.push([Maps.put(env, '${name}', ${name}), Arrays.push(ptuples, tuple)]); // mutation iso. functional?
}  
      `; 
    }    
  }
  throw new Error("compile error: " + term);
}


function emitRuleAtomFire(atomNumber, atom, compileEnv, wl, previousWl)
{
  if (atom instanceof Atom)
  {
    console.log(`emitRuleAtomFire ${atomNumber} Atom ${atom}`);
    const comment = `// atom ${atomNumber} ${atom}`;
    
    const pred = atom.pred;
  
    const termFires = atom.terms.map((term, termNumber) => emitRuleAtomTermFire(termNumber, term, pred, compileEnv, termNumber === (atom.terms.length - 1) ? wl : (wl + "_" + termNumber))).join('\n');
  
    return `
${comment}
const ${wl} = [];
for (const [env, ptuples] of ${previousWl})
{
  ${termFires}
}
    `;
  }
  if (atom instanceof Assign)
  {
    assertTrue(atom.operator === '=');

    console.log(`emitRuleAssignFire ${atomNumber} Assign ${atom}`);
    const comment = `// assign ${atomNumber} ${atom}`;  
    const name = atom.left.name;

    if (compileEnv.has(name))
    {
      throw new Error("compile error: assigning to bound var " + name);
    }

    compileEnv.add(name);
    const compiledRight = compileTerm(atom.right);

    return `
${comment}    
const ${wl} = [];
for (const [env, ptuples] of ${previousWl})
{
  const ${name} = env.get('y');
  ${wl}.push([Maps.put(env, '${name}', ${compiledRight}), ptuples]); // mutation?
}    
    `;
  }
  throw new Error("compile error: " + atom);
}

// (R x sum<z>) :- (X x) (I x y), z = y*y 
function emitRuleObject(rule, ruleNumber)
{
  console.log(`emitRuleObject ${ruleNumber} ${rule}`);
  const ruleComment = "/*\n " + rule + "\n*/";
  const ruleName = "Rule" + ruleNumber;
  const compileEnv = new Set();
  const atomFires = rule.body.map((atom, atomNumber) => emitRuleAtomFire(atomNumber, atom, compileEnv, `wl${atomNumber+1}`, `wl${atomNumber}`)).join('\n');
  const bindComment = "// bind head " + rule.head;

  return `
${ruleComment}  
const ${ruleName} =
{
  name : '${ruleName}',
  
  // fire with delta tuples for deltaPos
  fire(deltaPos, deltaTuples)
  {
    const wl0 = [[new Map(), []]]; // env + ptuples
    
    ${atomFires}

    ${bindComment}
    const updates = new Map(); // groupby -> additionalValues
    for (const [env, ptuples] of wl${rule.body.length})
    {
      const x = env.get('x');
      const z = env.get('z');
      const productGB = new ProductGB(new Set(ptuples), env);
      const groupby = new Rule1GB(x);

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [z]);
        }
        else
        {
          currentAdditionalValues.push(z);
        }
        for (const tuple of ptuples)
        {
          tuple._outproducts.add(productGB);
        }
        productGB._outgb = groupby;
      }
    }

    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple; // should be API
      const currentValue = currentResultTuple === null ? 0 : currentResultTuple.z;
      const updatedValue = additionalValues.reduce((acc, val) => acc + val, currentValue);
      const updatedResultTuple = new R(groupby.x, updatedValue);  
      groupby._outtuple = updatedResultTuple;
    }
  }
}
  `;
}

function compileTerm(term)
{
  if (term instanceof Var)
  {
    return `env.get('${term.name}')`;
  }
  if (term instanceof Bin)
  {
    return compileTerm(term.left) + term.operator + compileTerm(term.right);
  }
  throw new Error("compile term error: " + term);
}


const emitImports = `import {
  assertTrue, Maps, Sets, Arrays,
  ProductGB, productsGB, TuplePartition,
  atomString, termString,
} from './scriptlog-common.mjs';
`;


const emitRest = `
export function toDot()
{
  function tupleTag(tuple)
  {
    return tuple.constructor.name + tuple._id;
  }

  function productTag(product)
  {
    return "p" + product._id;
  }

  function groupbyTag(gb)
  {
    return gb.rule.name() + gb._id;
  }
  
  let sb = "digraph G {\\nnode [style=filled,fontname=\\"Roboto Condensed\\"];\\n";

  for (const tuple of tuples())
  {
    const t = tupleTag(tuple);
    sb += \`\${t} [shape=box label="\${tuple}"];\\n\`;
    for (const product of tuple._outproducts)
    {
      sb += \`\${t} -> \${productTag(product)};\\n\`;    
    }
  }

  for (const productGB of productsGB())
  {
    const p = productTag(productGB);
    sb += \`\${p} [label="\${[...productGB.env.entries()].map(entry => entry[0]+":"+termString(entry[1]))}"];\\n\`;
    sb += \`\${p} -> \${groupbyTag(productGB._outgb)};\\n\`;    
  }

  for (const groupby of groupbys())
  {
    const gb = groupbyTag(groupby);
    sb += \`\${gb} [shape=diamond label="\${groupby}"];\\n\`;
    const tuple = groupby._outtuple;
    if (tuple)
    {
      sb += \`\${gb} -> \${tupleTag(tuple)};\\n\`;
    }
  }
  sb += "}";
  return sb;
}
`;


const result = compileFile("example1");
console.log(String(result));
console.log("done");


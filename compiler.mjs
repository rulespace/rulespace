import fs from 'fs';
import { assertTrue, Sets } from './common.mjs';
import { parseProgram, Var, Atom, Bin, Assign, Agg} from './parser.mjs';
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
  
  for (const [pred, arity] of staticInfo.pred2arity)
  {
    sb.push(emitTupleClass(pred, arity));
  }

  staticInfo.rules.forEach((rule, i) =>
  {
    sb.push(emitRuleObject(rule, i));
  });

  sb.push(emitIterators(staticInfo.predicates, staticInfo.rules));
  
  sb.push(emitRest);

  return sb.join('\n');
}


function emitTupleClass(pred, arity)
{
  const termNames = Array.from(Array(arity), (_, i) => "t" + i);
  const termEqualities = termNames.map(t => `Object.is(member.${t}, ${t})`);
  const termAssignments = termNames.map(t => `this.${t} = ${t}`);
  const termToStrings = termNames.map(t => `this.${t}`);
  return `

export class ${pred}
{

  static members = [];
  _outproducts = new Set();

  constructor(${termNames})
  {
    for (const member of ${pred}.members)
    {
      if (${termEqualities.join(' && ')})
      {
        return member;
      }
    }
    ${termAssignments.join('; ')};
    this._id = ${pred}.members.length;
    ${pred}.members.push(this);
  }

  toString()
  {
    return atomString('${pred}', ${termToStrings.join(', ')});
  }
}
  `;
}

function compileRuleFireBody(head, body, i, compileEnv)
{
  if (i === body.length)
  {
    const ptuples = Array.from(Array(i-1), (_, j) => "tuple" + j);
    const agg = head.terms[head.terms.length - 1];
    assertTrue(agg instanceof Agg);
    const aggregand = agg.aggregand;
    const gb = head.terms.slice(0, head.terms.length - 1);
    return `
      // updates for ${head}
      const ptuples = new Set([${ptuples.join()}]);
      const productGB = new ProductGB(ptuples, ${aggregand});
      const groupby = new Rule1GB(${gb.join()});

      if (productGB._outgb === groupby) // 'not new': TODO turn this around
      {
        // already contributes, do nothing
      }
      else
      {
        const currentAdditionalValues = updates.get(groupby);
        if (!currentAdditionalValues)
        {
          updates.set(groupby, [${aggregand}]);
        }
        else
        {
          currentAdditionalValues.push(${aggregand});
        }
        for (const tuple of ptuples)
        {
          tuple._outproducts.add(productGB);
        }
        productGB._outgb = groupby;
      }
`;
  }


  const atom = body[i];

  if (atom instanceof Atom)
  {
    const tuple = "tuple" + i;
    const pred = atom.pred;
    const bindUnboundVars = [];
    const conditions = [];
    atom.terms.forEach((term, i) => {
      if (term instanceof Var)
      {
        if (compileEnv.has(term.name))
        {
          conditions.push(`${tuple}.t${i} === ${term.name}`);
        }
        else
        {
          bindUnboundVars.push(`const ${term.name} = ${tuple}.t${i};`);
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
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : ${pred}.members))
      {
        ${bindUnboundVars.join('\n')}
        ${compileRuleFireBody(head, body, i+1, compileEnv)}
      }
      `;  
    }
    else
    {
      return `
      // atom ${atom} [conditions]
      for (const ${tuple} of (deltaPos === ${i} ? deltaTuples : ${pred}.members))
      {
        if (${conditions.join('&&')})
        {
          ${bindUnboundVars.join('\n')}
          ${compileRuleFireBody(head, body, i+1, compileEnv)}
        }
      }
      `;  
    }
  }

  if (atom instanceof Assign)
  {
    assertTrue(atom.operator === '='); // nothing else supported at the moment
    assertTrue(atom.left instanceof Var); // nothing else supported at the moment
    const name = atom.left.name;
    if (compileEnv.has(name))
    {
      throw new Error("assigning bound name: " + name);
    }
    compileEnv.add(name);
    const left = compileTerm(atom.left);
    const right = compileTerm(atom.right);
    return `
      // assign ${atom}
      const ${left} = ${right};

      ${compileRuleFireBody(head, body, i+1, compileEnv)}
    `;
  }

  throw new Error(body[i]);
}

// (R x sum<z>) :- (X x) (I x y), z = y*y 
function emitRuleObject(rule, ruleNumber)
{
  const pred = rule.head.pred;
  const ruleName = "Rule" + ruleNumber;
  const compileEnv = new Set();
  const gbNames = Array.from(Array(rule.head.terms.length - 2), (_, i) => "groupby"+i);
  const aggregandName ="t" + rule.head.terms.length - 1;

  const GBclass = emitRuleGBClass(rule, ruleName);

  return `
/* rule 
${rule}  
*/
const ${ruleName} =
{
  name : '${ruleName}',

  fire(deltaPos, deltaTuples)
  {
    const updates = new Map(); // groupby -> additionalValues

    ${compileRuleFireBody(rule.head, rule.body, 0, compileEnv)}
    
    // bind head ${rule.head}
    for (const [groupby, additionalValues] of updates)
    {
      const currentResultTuple = groupby._outtuple;
      const currentValue = currentResultTuple === null ? 0 : currentResultTuple.${aggregandName};
      const updatedValue = additionalValues.reduce((acc, val) => acc + val, currentValue);
      const updatedResultTuple = new ${pred}(${gbNames.join()}, updatedValue);  
      groupby._outtuple = updatedResultTuple;
    }
  }
} // end ${ruleName}

${GBclass}

  `;
}

function emitRuleGBClass(rule, ruleName)
{
  const numGbTerms = rule.head.terms.length - 1;
  const termNames = Array.from(Array(numGbTerms), (_, i) => "t" + i);
  const termEqualities = termNames.map(t => `Object.is(member.${t}, ${t})`);
  const termAssignments = termNames.map(t => `this.${t} = ${t}`);
  const termToStrings = termNames.map(t => `this.${t}`);
  const aggTerm = rule.head.terms[rule.head.terms.length - 1];
  return `
class ${ruleName}GB
{
  static members = [];
  _outtuple = null;

  constructor(${termNames.join(', ')})
  {
    for (const member of ${ruleName}GB.members)
    {
      if (${termEqualities.join(' && ')})
      {
        return member;
      }
    }
    ${termAssignments.join('; ')};
    this._id = ${ruleName}GB.members.length;
    ${ruleName}GB.members.push(this);
  }

  rule()
  {
    return ${ruleName};
  }

  toString()
  {
    return atomString('${rule.head.pred}', ${termToStrings.join(', ')}, ({toString: () => "${aggTerm}"}));
  }
}

  `;
}

function emitIterators(predNames, rules)
{
  const tupleYielders = predNames.map(pred => `yield* ${pred}.members;`);
  const gbYielders = rules.flatMap((rule, i) => rule.aggregates ? [`yield* Rule${i}GB.members;`] : []);

  return `
function* tuples()
{
  ${tupleYielders.join('\n  ')}
}

function* groupbys()
{
  ${gbYielders.join('\n  ')}
}  
  `;
}

function compileTerm(term)
{
  if (term instanceof Var)
  {
    return term.name;
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
  atomString,
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


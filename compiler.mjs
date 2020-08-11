import fs from 'fs';
import {assertTrue, Sets} from './common.mjs';
import {parseProgram, Visitor} from './parser.mjs';

export function compileFile(name)
{
  const compiled = compile(fs.readFileSync(`${name}.js`, 'utf8'));
  fs.writeFileSync(`${name}.mjs`, compiled, 'utf8');
}

export function compile(src)
{
  const program = parseProgram(src);

  const staticInfo = analyze(program);
  console.log(staticInfo);

  const sb = [];

  sb.push(emitImports);

  for (const [pred, arity] of staticInfo.predicates.entries())
  {
    sb.push(emitTupleClass(pred, arity));
  }


  
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

class CollectingVisitor extends Visitor
  {
    predicates = new Map(); // name -> arity
    rules = new Map(); // pred -> rules
    
    visitAtom(atom)
    {
      const pred = atom.pred;
      const arity = atom.arity();
      const currentArity = this.predicates.get(pred);
      if (currentArity === undefined)
      {
        this.predicates.set(pred, atom.terms.length);
      }
      else if (currentArity !== arity)
      {
        throw new Error("arity mismatch for predicate " + pred);
      }
      return true;
    }

    visitRule(rule)
    {
      const pred = rule.head.pred;
      const currentRules = this.rules.get(pred);
      if (currentRules === undefined)
      {
        this.rules.set(pred, [rule]);
      }
      else
      {
        currentRules.push(rule);
      }
      return true;
    }
  }
 
function analyze(program)
{
  const collectingVisitor = new CollectingVisitor();
  program.visit(collectingVisitor);
  return {
    predicates: collectingVisitor.predicates, 
    rules: collectingVisitor.rules
  };
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
    return gb.rule().name + gb._id;
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


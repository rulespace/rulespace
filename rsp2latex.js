import { analyzeProgram } from './analyzer.js';

export function rsp2latex(rsp)
{
  const analysis = analyzeProgram(rsp);

  let sb = ``;
  for (const stratum of analysis.strata())
  {
    sb += `\\paragraph{Stratum ${stratum.id}}\n`;
    for (const pred of analysis.stratumPreds(stratum))
    {
      const rules = [...analysis.predRules(pred)];
      const chunkedRules = chunkify(rules, 8);
      sb += `
      $\\mathsf{${termEnc(pred.name)}}$
      \\begin{mathpar}
      `;
      sb += chunkedRules.map(rules => rules.map(visit).join(`\\and\n`)).join('\n\\end{mathpar}\n\\begin{mathpar}\n');
      sb += `
      \\end{mathpar}
      `
    }
  }
  return sb;
}

function chunkify(a, n)
{
  return a.reduce((acc, value, i) =>
  {
    if (i % n === 0 && i !== 0)
    {
      acc.push([]);
    }
    acc[acc.length - 1].push(value);
    return acc;
  }, [[]]);
}

function visit(rsp)
{
  switch (rsp.constructor.name)
  {
    case 'Program':
      return `
        ${rsp.rules.map(visit).join('\n\n')}
      `;
    case 'Rule':
      return `
          \\inferrule[Rule${rsp._id}]      
          {
            ${rsp.body.length === 0 ? '\\quad' : rsp.body.map(visit).join('\\\\\n')}
          }
          {
            ${visit(rsp.head)}
          }
      `;
    case 'Atom':
      return `\\mathsf{${termEnc(rsp.pred)}}(${rsp.terms.map(visit).join(', ')})`;
    case 'App':
      return `${visit(rsp.operator)}(${rsp.operands.map(visit).join(', ')})`;
    case 'Assign':
      return `${visit(rsp.left)} ${visit(rsp.operator)} ${visit(rsp.right)}`;
    case 'Neg':
      return `\\neg ${visit(rsp.atom)}`;
    case 'Lit':
      if (typeof rsp.value === 'string')
      {
        return `\\texttt{\"${rsp.value}\"}`;
      }
      else if (rsp.value === true)
      {
        return `\\#t`;
      }
      else if (rsp.value === false)
      {
        return `\\#f`;
      }
      else
      {
        return String(rsp);
      }
    case 'Var':
      {
        const name = rsp.name;
        const liu = name.lastIndexOf('_');
        if (liu === -1 || liu === (name.length - 1))
        {
          return termEnc(name);
        }
        return `${termEnc(name.substring(0, liu))}_{${termEnc(name.substring(liu + 1))}}`;
      }
    case 'String':
      {
        return String(rsp);
      }
    default:
      throw new Error(`cannot handle ${rsp} of type ${rsp.constructor.name}`);
  }
}

const encMap = new Map();
encMap.set(`‘`, `'`);
encMap.set(`’`, `'`);
encMap.set(`$`, `\\$`);
encMap.set(`_`, `\\_`);
encMap.set(`#`, `\\#`);
encMap.set(`κ`, `\\kappa`);

function termEnc(str)
{
  let sb = "";
  for (const c of str)
  {
    const replace = encMap.get(c) ?? c;
      //   c === "“" || c === "”" ||
      //   c === "«" || c === "»" ||
      //   c === "…" || c === "?" ||
      //   c === "+" || c === "-" || c === "*" || c === "/" || c === "=" || c === "<" || c === ">"
      //  )
    sb += replace;
  }
  return sb;
}
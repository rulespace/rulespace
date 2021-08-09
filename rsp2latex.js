export function rsp2latex(rsp) // TODO: placeholder
{
  switch (rsp.constructor.name)
  {
    case 'Program':
      return `
        ${rsp.rules.map(rsp2latex).join('\n\n')}
      `;
    case 'Rule':
      return `
        \\begin{mathpar}
        \\inferrule[Rule${rsp._id}]
          {
            ${rsp.body.length === 0 ? '\\quad' : rsp.body.map(rsp2latex).join('\\\\\n')}
          }
          {
            ${rsp2latex(rsp.head)}
          }
        \\end{mathpar}     
      `;
    case 'Atom':
      return `\\mathsf{${termEnc(rsp.pred)}}(${rsp.terms.map(rsp2latex).join(', ')})`;
    case 'App':
      return `${rsp2latex(rsp.operator)}(${rsp.operands.map(rsp2latex).join(', ')})`;
    case 'Assign':
      return `${rsp2latex(rsp.left)} ${rsp2latex(rsp.operator)} ${rsp2latex(rsp.right)}`;
    case 'Neg':
      return `\\neg ${rsp2latex(rsp.atom)}`;
    case 'Lit':
      if (typeof rsp.value === 'string')
      {
        return `\`\`${rsp.value}''`;
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
        return termEnc(rsp.name);
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
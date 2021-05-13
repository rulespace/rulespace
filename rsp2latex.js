export function rsp2latex(rsp) // TODO: placeholder
{
  switch (rsp.constructor.name)
  {
    case 'Program':
      return rsp.rules.map(toString).join('\n');
    case 'Rule':
      return `${toString(rsp.head)} :- ${rsp.body.map(toString).join(', ')}`;
    case 'Atom':
      return `${rsp.pred}(${rsp.terms.map(toString).join(', ')})`;
    case 'Neg':
      return `!${toString(rsp.atom)}`;
    default:
      return String(rsp);
  }
}

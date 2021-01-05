import fs from 'fs';
import { compile } from './compiler.mjs';

export function compileToConstructor(src)
{
  const compiled = compile(src,  {module:false});
  return Function(compiled);
}

export function compileToModule(src, name)
{
  name === undefined ? 'run' : name;
  const compiled = compile(src, {module:true});
  fs.writeFileSync(`compiled/${name}.mjs`, compiled, 'utf8');
  return import(`./compiled/${name}.mjs`);
}

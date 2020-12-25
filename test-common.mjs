import fs from 'fs';
import { compile } from './compiler.mjs';

export function compileToModule(src, name)
{
  name === undefined ? 'run' : name;
  const compiled = compile(src);
  fs.writeFileSync(`compiled/${name}.mjs`, compiled, 'utf8');
  return import(`./compiled/${name}.mjs`);
}
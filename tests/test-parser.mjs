import {SchemeParser, Pair } from '../parser.mjs';

const parser = new SchemeParser();

const result = parser.parse(`

'a

`);

for (const exp of result)
{
  console.log(exp.toString());
}


console.log("donare");
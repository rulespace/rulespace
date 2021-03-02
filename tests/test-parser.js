import {SchemeParser, Pair } from '../sexp-reader.js';

const parser = new SchemeParser();

const result = parser.parse(`

[X]

`);

for (const exp of result)
{
  console.log(exp.toString());
}


console.log("donare");
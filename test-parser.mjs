import {SchemeParser, Pair } from './parser.mjs';

const parser = new SchemeParser();

const result = parser.parse(`

(define [E #:avg x] [D x] [E v])

`);

for (const exp of result)
{
  console.log(exp.toString());
}


console.log("donare");
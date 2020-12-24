import {SchemeParser, Pair } from './parser.mjs';

const parser = new SchemeParser();

const result = parser.parse(`

(define [Rcount X #:count Y]
  [I X Y])


`);

for (const exp of result)
{
  console.log(exp.toString());
}


console.log("donare");
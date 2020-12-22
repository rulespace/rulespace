import {SchemeParser, Pair } from './parser.mjs';

const parser = new SchemeParser();

const result = parser.parse(`

(define [Unreachable X Y]
  [Node X] [Node Y] (not [Reachable X Y]))

`);

for (const exp of result)
{
  console.log(exp.toString());
}


console.log("donare");
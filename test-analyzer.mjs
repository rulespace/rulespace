import fs from 'fs';
import { assertTrue } from './common.mjs';
import { SchemeParser,  } from './parser.mjs';
import { analyzeProgram } from './analyzer.mjs';

const file = fs.readFileSync('example5.sl', 'utf8');
const parser = new SchemeParser();
const program = parser.parse(file);
console.log("Program:\n" + program);
const analysis = analyzeProgram(program);
console.log("Analysis:\n" + analysis);

console.log("preds: " + analysis.preds);
console.log("rules:\n" + analysis.program.rules.map(rule => `${rule} agg ${rule.aggregates()}\n`));

analysis.strata.map(function (stratum)
{
  console.log(stratum.toString());
})



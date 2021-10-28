import { str2sexp  } from '../str2sexp.js';
import { sexp2rsp  } from '../sexp2rsp.js';
import { analyzeProgram } from '../analyzer.js';

const src = `
(rule [R x t]
  [I x 'y])

(rule [S x y z]
  [R x [V y z]])
`

const sexp = str2sexp(src);
console.log("Sexp:\n" + sexp);
const rsp = sexp2rsp(sexp);
console.log("Rsp:\n" + rsp);
const analysis = analyzeProgram(rsp);
console.log("Analysis:\n" + analysis);

console.log();

console.log("preds: " + analysis.preds);
console.log("rules:\n" + analysis.program.rules.map(rule => `${rule} agg ${rule.aggregates()}`).join('\n'));
console.log("strata:\n" + analysis.strata().join('\n'));



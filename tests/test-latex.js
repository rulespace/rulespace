import { rsp2latex } from "../rsp2latex.js";
import { compileToRsp } from "./test-common.js";


const src = `
(rule [Reachable x y]
  [Link x y])
(rule [Reachable x y]
  [Link x z] [Reachable z y])
(rule [Node x]
  [Link x _])
(rule [Node y]
  [Link _ y])
(rule [Unreachable x y]
  [Node x] [Node y] (not [Reachable x y]))

`;


const rsp = compileToRsp(src);
const latex = rsp2latex(rsp);

console.log(latex);
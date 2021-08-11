import { rsp2latex } from "../rsp2latex.js";
import { compileToRsp } from "./test-common.js";


const src = `
(rule [A x] [B x] [C x])
`;


const rsp = compileToRsp(src);
const latex = rsp2latex(rsp);

console.log(latex);
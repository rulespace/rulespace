import { compileToConstructor } from '../utils.js';
import { compileModuleTuples } from '../tests/test-common.js';

const src =
`
 (rule [R 1] (not [L 41]))
`;


const ctr = compileToConstructor(src, {debug:true, assertions:true});
const instance = ctr();
const { added } = instance.addTuples(compileModuleTuples(instance, `[L 42]`));

console.log(added());

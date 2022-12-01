import { compileToConstructor } from '../utils.js';

let src =
`
; Rule: A(x) and not B(x + 10) -> R(x)
(rule [R x]
    [A x]
    (:= y (+ x 10))
    (not [B y]))

(rule [A  1])
(rule [A  2])
(rule [A  3])
(rule [A  4])
(rule [A  5])

(rule [B 11])
(rule [B 12])
(rule [B 14])
`;

const logTuples = (name, arr) => {
    console.log(`>>> ${name}:`);
    for (let t in arr) {
        console.log(`  > ${arr[t]}`);
    }
    console.log(``);
};

const ctr = compileToConstructor(src);
const instance = ctr();

logTuples(`all tuples`, [...instance.tuples()]);
logTuples(`R tuples`, [...instance.tuples().filter(t => t.name() === 'R')]);


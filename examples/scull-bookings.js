import { compileToConstructor } from '../utils.js';
import { compileModuleTuples } from '../tests/test-common.js';

const src =
`
[BookingCanceled "user" 1 1]
[BookingCanceled "user" 1 2]
[BookingCanceled "user" 1 3]

[BookingCanceled "user" 2 1]
[BookingCanceled "user" 2 2]
[BookingCanceled "user2" 2 3]
[BookingCanceled "user3" 2 4]
[BookingCanceled "user4" 2 5]
 
 (rule [CancellationsToday user today #:count user] [BookingCanceled user today _])

 (rule [Cancellations #:sum count] [CancellationsToday user today count])
`;


const ctr = compileToConstructor(src, {debug:true, assertions:true});
const instance = ctr();

console.log("\n\n\n");
console.log("tuples: " + [...instance.tuples()].join('\n'));
console.log("\n\n\n");
instance.addTuples(compileModuleTuples(instance, `[BookingCanceled "user4" 2 6]`));

console.log("tuples: " + [...instance.tuples()].join('\n'));

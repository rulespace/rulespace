import os from 'os';
import { performance } from 'perf_hooks';
import { compileToConstructor, toModuleTupleFor } from './test-common.mjs';

const PERF_LOG_FILE_PREFIX = 'logs/perflog-';
const PERF_LOG_FILE_SUFFIX = '.csv';
const HOST_NAME = os.hostname().replace(/\./, '').replace(/-/g, '');
const TEST_DATE = new Date();
const TEST_ID = TEST_DATE.getTime();
const TEST_MONTH = zeroPad(TEST_DATE.getMonth() + 1);
const TEST_YEAR = String(TEST_DATE.getFullYear());
const FILE_NAME = PERF_LOG_FILE_PREFIX + HOST_NAME + TEST_YEAR + TEST_MONTH + PERF_LOG_FILE_SUFFIX;

// logged
const TEST_DATE_STRING = TEST_YEAR + TEST_MONTH + zeroPad(TEST_DATE.getDate());
const TEST_TIME_STRING = zeroPad(TEST_DATE.getHours()) + zeroPad(TEST_DATE.getMinutes());

import { wl as lrnu100 } from './wl-lrnu100.mjs';
import { wl as lrnu1000 } from './wl-lrnu1000.mjs';
import { wl as lrnunegaddrem } from './wl-lrnunegaddrem.mjs';
import { wl as lrnu500 } from './wl-lrnu500.mjs';

const COMMENT = '';

const perfs = [];

console.log("test id: " + TEST_ID);
performTest(lrnunegaddrem);
performTest(lrnu100);
performTest(lrnu500);
performTest(lrnu1000);

console.log('\n\n=============');
console.log(perfs.join('\n'));

function zeroPad(n)
{
  if (n < 10)
  {
    return "0" + n;
  }
  return String(n);
}

function addTuplesFor(module)
{
  return (...ts) => module.add_tuples(ts.map(toModuleTupleFor(module)));
}

function removeTuplesFor(module)
{
  return (...ts) => module.remove_tuples(ts.map(toModuleTupleFor(module)));  
}

function logPerf(testName, ...wlDuration)
{
  const perfLine = [HOST_NAME, TEST_ID, TEST_DATE_STRING, TEST_TIME_STRING, COMMENT, testName, ...wlDuration].join(';');
  console.log(perfLine);
  perfs.push(perfLine);
  //fs.appendFileSync(FILE_NAME, testLine + '\n');
}

function performTest({name, src, moduleCb, wlCb})
{
  console.log(name);
  //const compilationStart = performance.now();
  const ctr = compileToConstructor(src);
  //const compilationDuration = performance.now() - compilationStart;

  const wlDurations = [];

  if (moduleCb)
  {
    for (let i = 0; i < 3; i++)
    {
      const module = ctr();
      const wlStart = performance.now();
      moduleCb(module);
      wlDurations.push(Math.round(performance.now() - wlStart));    
    }
  }
  else
  {
    for (let i = 0; i < 3; i++)
    {
      const module = ctr();
      const addTuples = addTuplesFor(module);
      const removeTuples = removeTuplesFor(module);
      const wlStart = performance.now();
      wlCb(addTuples, removeTuples);

      wlDurations.push(Math.round(performance.now() - wlStart));    
    }
  }

  logPerf(name, ...wlDurations);
}

import fs from 'fs';
import os from 'os';
import { performance } from 'perf_hooks';
import { compileToModule } from './test-common.js';

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

import { wl } from './wl-lrnu1000.js';

// needed when compiling to ctr
global.performance = performance;

performProfiling(wl);

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
  return (...ts) => module.add_tuples(ts);
}

function removeTuplesFor(module)
{
  return (...ts) => module.remove_tuples(ts);  
}


function performProfiling({name, src, moduleCb, wlCb})
{
  console.log(name);

  compileToModule(src, 'profile', {profile:true,assertions:false}).then(module => {
  // import('./compiled/profile.mjs').then(module => {

    const wlStart = performance.now();
    if (moduleCb)
    {
      moduleCb(module);
    }
    else
    {
      const addTuples = addTuplesFor(module);
      const removeTuples = removeTuplesFor(module);
      wlCb(addTuples, removeTuples);  
    }
    const wlDuration = Math.round(performance.now() - wlStart);    
    console.log(`wl duration: ${wlDuration} ms`);
    console.log(module.profileResults());
  });
}

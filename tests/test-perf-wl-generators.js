import { Unique } from './test-common.js';

function random(min, max) // min and max included 
{
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function lrnu100()
{
  const unique = new Unique();
  const tuples = new Set();
  
  
  for (let i = 0; i < 100; i++)
  {
    let tuple;
    do
    {
      tuple = unique.tuple(['Link', random(1, 20), random(1,20)]);
    }
    while (tuples.has(tuple));
    tuples.add(tuple);
  }
  
  const orderedTuples = [...tuples];
  orderedTuples.forEach((t, i) => console.log(`const t${i} = new module.Link(${t[1]}, ${t[2]})`));
  const current = [];
  let j = 0;
  while (j < orderedTuples.length)
  {
    if (current.length > 10 && random(1, 10) <= 5)
    {
      const delIndex = random(0, current.length - 1);
      const tnum = current.splice(delIndex, 1)[0];
      console.log(`module.removeTuples([t${tnum}]);`);
    }
    else
    {
      console.log(`module.addTupleMap(new Map([[module.Link, [t${j}]]]));`);
      current.push(j);
      j++;
    }
  }
  
  while (current.length > 0)
  {
    const tnum = current.pop();
    console.log(`module.removeTuples([t${tnum}]);`);
  }
}



function lrnu1000()
{
  const unique = new Unique();
  const tuples = new Set();
  
  
  for (let i = 0; i < 1000; i++)
  {
    let tuple;
    do
    {
      tuple = unique.tuple(['Link', random(1, 100), random(1,100)]);
    }
    while (tuples.has(tuple));
    tuples.add(tuple);
  }
  
  const orderedTuples = [...tuples];
  orderedTuples.forEach((t, i) => console.log(`const t${i} = new module.Link(${t[1]}, ${t[2]})`));
  const current = [];
  let j = 0;
  while (j < orderedTuples.length)
  {
    if (current.length > 0 && random(1, 10) < 5)
    {
      const delIndex = random(0, current.length - 1);
      const tnum = current.splice(delIndex, 1)[0];
      console.log(`module.removeTuples([t${tnum}]);`);
    }
    else
    {
      console.log(`module.addTupleMap(new Map([[module.Link, [t${j}]]]));`);
      current.push(j);
      j++;
    }
  }
  
  while (current.length > 0)
  {
    const tnum = current.pop();
    console.log(`module.removeTuples([t${tnum}]);`);
  }
}

function lrnu500()
{
  const unique = new Unique();
  const tuples = new Set();
  
  
  for (let i = 0; i < 500; i++)
  {
    let tuple;
    do
    {
      tuple = unique.tuple(['Link', random(1, 40), random(1, 40)]);
    }
    while (tuples.has(tuple));
    tuples.add(tuple);
  }
  
  const orderedTuples = [...tuples];
  orderedTuples.forEach((t, i) => console.log(`const t${i} = new module.Link(${t[1]}, ${t[2]})`));
  const current = [];
  let j = 0;
  while (j < orderedTuples.length)
  {
    if (current.length > 0 && random(1, 10) < 5)
    {
      const delIndex = random(0, current.length - 1);
      const tnum = current.splice(delIndex, 1)[0];
      console.log(`module.removeTuples([t${tnum}]);`);
    }
    else
    {
      console.log(`module.addTupleMap(new Map([[module.Link, [t${j}]]]));`);
      current.push(j);
      j++;
    }
  }
  
  while (current.length > 0)
  {
    const tnum = current.pop();
    console.log(`module.removeTuples([t${tnum}]);`);
  }
}


lrnu500();



const n = 8;

let x = 1;
let y = 2;

while (y <= n)
{
  if (x < n)
  {
    x = x * 2;
  }
  else
  {
    x = x - y;
  }
  y = y + 1;
  console.log(x);
}

console.log(x, y)
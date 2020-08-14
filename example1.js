r[X, {sum: Z}]
{
  x[X], i[X, Y], Z = Y*Y
}

reachable[X, Y] // 1
{
  link[X, Y]
}

reachable2[X, Y] // 2
{
  reachable[X, Z], link[Z, Y]
}

reachable[X, Y] // 3
{
  reachable2[X, Y]
}

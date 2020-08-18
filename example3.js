reachable[X, Y] 
{
  link[X, Y]
}

reachable2[X, Y] 
{
  reachable[X, Z], link[Z, Y]
}

reachable[X, Y]
{
  reachable2[X, Y]
}

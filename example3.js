reachable[X, Y] 
{
  link[X, Y]
}

reachable[X, Y] 
{
  link[X, Z], reachable[Z, Y]
}

node[X]
{
  link[X, _]
}

node[Y]
{
  link[_, Y]
}


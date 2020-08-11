export function assertTrue(x)
{
  if (x !== true)
  {
    throw new Error("expected true, got: " + x);
  }
}

export function assertFalse(x)
{
  if (x !== false)
  {
    throw new Error("expected false, got: " + x);
  }
}

export const Arrays =
{
  push(array, x)
  {
    const array2 = array.slice(0);
    array2.push(x);
    return array2;
  }
}

export const Sets = 
{
  equals(x, y)
  {
    if (x === y)
    {
      return true;
    }
    if (x.size !== y.size)
    {
      return false;
    }
    for (const xvalue of x)
    {
      if (!y.has(xvalue))
      {
        return false;
      }
    }
    return true;
  },

  union(x, y)
  {
    const union = new Set(x);
    for (const elem of y)
    {
      union.add(elem);
    }
    return union;
  }

}

export const Maps =
{
  put(map, key, value)
  {
    const map2 = new Map(map);
    map2.set(key, value);
    return map2;
  }
}
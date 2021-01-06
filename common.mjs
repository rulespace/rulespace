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

export function equals(x, y)
{
  if (x === null || x === undefined || y === null || y === undefined) { return x === y; }
  if (x.constructor !== y.constructor) { return false; }
  if (x instanceof Function) { return x === y; }
  // if (x instanceof RegExp) { return x === y; }
  if (x === y || x.valueOf() === y.valueOf()) { return true; }
  if (Array.isArray(x) && x.length !== y.length) { return false; }

  // if (x instanceof Date) { return false; }
  if (!(x instanceof Object)) { return false; }
  if (!(y instanceof Object)) { return false; }

  const p = Object.keys(x);
  return Object.keys(y).every(
    function (i) { return p.indexOf(i) !== -1; }) &&
      p.every(
        function (i) {return equals(x[i], y[i])});
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
  },

  difference(x, y)
  {
    const difference = new Set(x)
    for (const elem of y)
    {
      difference.delete(elem);
    }
    return difference;
  }
}

export const MutableSets =
{
  addAll(x, y)
  {
    for (const elem of y)
    {
      x.add(elem);
    }
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

export const MutableMaps =
{
  putPushArray(map, key, value)
  {
    const current = map.get(key);
    if (current === undefined)
    {
      map.set(key, [value]);
    }
    else
    {
      current.push(value);
    }
  },

  putAddSet(map, key, value)
  {
    const current = map.get(key);
    if (current === undefined)
    {
      map.set(key, new Set([value]));
    }
    else
    {
      current.add(value);
    }
  }
}

export const Strings = {};

Strings.hashCode =
    function (x)
    {
      var l = x.length;
      if (l === 0)
      {
        return 0;
      }
      var result = 1;
      for (var i = 0; i < l; i++)
      {
        result = (31 * result + x.charCodeAt(i)) >> 0;
      }
      return result;
    }

Strings.smartTrim =
    function (s, l = 30)
    {
      const ss = String(s);
      if (ss.length <= l)
      {
        return ss;
      }
      const cut1 = ss.length - l + 10;
      const cut2 = ss.length - 10;
      return ss.substring(0, cut1) + "..." + ss.substring(cut2);
    }

export const Characters = {};

Characters.isWhitespace =
  function (x)
  {
    return x === " " || x === "\n" || x === "\t" || x === "\r";
  }
  
Characters.isDigit =
  function (x)
  {
    return x === "0" || x === "1" || x === "2" || x === "3" || x === "4" || x === "5" || x === "6" || x === "7" || x === "8" || x === "9";
  }

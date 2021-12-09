class Link extends Array
{
  name()
  {
    return "Link";
  }
}

const l = new Link(1, 4);

console.log(l, l.name(), l.values());
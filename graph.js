import { visitNodes } from "./utils.js";

// every node object should be unique (object identity)
export class Graph
{

  constructor()
  {
    this._nodes = new Set();
    this._fw = new Map();
    this._bw = new Map();
  }

  nodes()
  {
    return this._nodes;
  }

  *edges()
  {
    for (const [from, tos] of this._fw.entries())
    {
      for (const to of tos)
      {
        yield [from, to];
      }
    }
  }

  predecessors(node)
  {
    return this._bw.get(node);
  }

  successors(node)
  {
    return this._fw.get(node);
  }

  addNode(node)
  {
    if (this._nodes.has(node))
    {
      return;
    }
    this._nodes.add(node);
    this._fw.set(node, new Set());
    this._bw.set(node, new Set());    
  }

  addEdge(from, to)
  {
    this.addNode(from);
    this.addNode(to);
    this._fw.get(from).add(to);
    this._bw.get(to).add(from);
  }

  nodeSmooth(nodeRemoveF)
  {
    for (const node of this.nodes()) 
    {
      if (nodeRemoveF(node))
      {
        const preds = this.predecessors(node);
        const succs = this.successors(node);
        for (const pred of preds)
        {
          const predOutgoing = this._fw.get(pred);
          predOutgoing.delete(node);
          for (const succ of succs)          
          {
            predOutgoing.add(succ);
            this._bw.get(succ).add(pred);
          }
        }
        for (const succ of succs)
        {
          this._bw.get(succ).delete(node);
        }
        this._nodes.delete(node);
        this._fw.delete(node);
        this._bw.delete(node);
      }
    }
  }

  replaceNode(node, newNode) // TODO: untested
  {
    const preds = this.predecessors(node);
    const succs = this.successors(node);
    for (const pred of preds)
    {
      const predOutgoing = this._fw.get(pred);
      predOutgoing.delete(node);
      predOutgoing.add(newNode);
    }
    for (const succ of succs)          
    {
      const succIncoming = this._bw.get(succ);
      succIncoming.delete(node);
      succIncoming.add(newNode);
    }
    this._nodes.delete(node);
    this._fw.delete(node);
    this._bw.delete(node);
    this.addNode(newNode);    
    const newOutgoing = this._fw.get(newNode);
    for (const succ of succs)
    {
      newOutgoing.add(succ);
    }
    const newIncoming = this._bw.get(newNode);
    for (const pred of preds)          
    {
      newIncoming.add(pred);
    }
  }

  mapNodes(f)
  {
    const nodeMap = new Map();
    for (const node of this.nodes())
    {
      nodeMap.set(node, f(node));
    }

    function mapNode(n)
    {
      return nodeMap.get(n);
    }

    const fwMapped = new Map();
    const bwMapped = new Map();
    for (const [source, dests] of this._fw)
    {
      fwMapped.set(mapNode(source), new Set([...dests].map(mapNode)));
    }
    for (const [dest, sources] of this._bw)
    {
      bwMapped.set(mapNode(dest), new Set([...sources].map(mapNode)));
    }
    const g = new Graph();
    g._nodes = nodeMap.values();
    g._fw = fwMapped;
    g._bw = bwMapped;
    return g;
  }

  // every node object requires a numerical and unique id
  toDot(nodeLabeler = n => String(n))
  {
    
    let sb = `digraph G {\nnode [style=filled,fontname="Roboto Condensed"];\n`;
  
    for (const node of this.nodes())
    {
      sb += `${node.id} [shape=box label="${nodeLabeler(node)}"];\n`;
    }
    
    for (const edge of this.edges())
    {
      sb += `${edge[0].id} -> ${edge[1].id};\n`
    }
    sb += "}";
  
    return sb;
  }
}

export function instance2graph(instance)
{
  const tuples = [...instance.rootTuples()];
  const nodes = new Map(); 
  let tag = 0;

  function getValue(value)
  {
    if (value instanceof Function)
    {
      return '<function>';
    }
    if (value._outproducts)
    {
      return getTuple(value);
    }
    if (typeof value === 'string')
    {
      return `\\"${value}\\"`
    }
    return value;
  }

  function getTuple(tuple)
  {
    const x = nodes.get(tuple);
    if (x !== undefined)
    {
      return x;
    }
    const t = {id: tag++, type: 'tuple', name: tuple.name(), values: tuple.values().map(getValue)};
    nodes.set(tuple, t);
    return t;
  }

  function getProduct(product)
  {
    const x = nodes.get(product);
    if (x !== undefined)
    {
      return x;
    }
    const p = {id: tag++, type: 'product'};
    nodes.set(product, p);
    return p;
  }

  function getProductGb(product)
  {
    const x = nodes.get(product);
    if (x !== undefined)
    {
      return x;
    }
    const p = {id: tag++, type: 'productGb'};
    nodes.set(product, p);
    return p;
  }

  function getGroupBy(groupBy)
  {
    const x = nodes.get(groupBy);
    if (x !== undefined)
    {
      return x;
    }
    const gb = {id: tag++, type: 'groupBy'};
    nodes.set(groupBy, gb);
    return gb;
  }

  const g = new Graph();

  visitNodes(instance, tuples,
    tuple => { 
      const t = getTuple(tuple);
      instance.outProducts(tuple).forEach(product => g.addEdge(t, getProduct(product)));
      instance.outProductsGroupBy(tuple).forEach(product => g.addEdge(t, getProductGb(product)));
      return true;
    },
    product => {
      g.addEdge(getProduct(product), getTuple(instance.outTuple(product)));
      return true;
    },
    productGb => {
      g.addEdge(getProductGb(productGb), getGroupBy(instance.outGroupBy(productGb)));
      return true;
    },
    groupBy => {
      const outTuple = instance.outTuple(groupBy);
      if (outTuple !== null)
      {
        g.addEdge(getGroupBy(groupBy), getTuple(outTuple));
      }
      return true;
    });

  return g;
}

export function pgraph2dot(g)
{

  function valueLabel(value)
  {
    if (value?.type === 'tuple')
    {
      return tupleLabel(value);
    }
    return value;
  }

  function tupleLabel(tuple)
  {
    return `[${tuple.name} ${tuple.values.map(valueLabel).join(' ')}]`;
  }

  function gbLabel(gb)
  {
    return gb;
  }

  function productLabel(product)
  {
    return product.constructor.name;
  }

  function productGBLabel(product)
  {
    return product.constructor.name;
  }
  
  function getTag(obj)
  {
    return obj.id;
  }
  
  let sb = `digraph G {\nnode [style=filled,fontname="Roboto Condensed"];\n`;

  for (const node of g.nodes())
  {
    if (node.type === 'tuple')
    {
      sb += `${getTag(node)} [shape=box label="${tupleLabel(node)}"];\n`;
    }
    else if (node.type === 'product')
    {
      sb += `${getTag(node)} [label="${productLabel(node)}" color="0.650 0.200 1.000"];\n`;
    }
    else if (node.type === 'productGb')
    {
      sb += `${getTag(node)} [label="${productGBLabel(node)}"];\n`;
    }
    else if (node.type === 'groupBy')
    {
      sb += `${getTag(node)} [label="${gbLabel(node)}" color="0.650 0.200 1.000"];\n`;
    }
    else
    {
      throw new Error(`cannot handle type ${node.type}`);
    }
  }
  
  for (const edge of g.edges())
  {
    sb += `${getTag(edge[0])} -> ${getTag(edge[1])};\n`
  }
  sb += "}";

  return sb;
}

export function instance2dot(instance)
{
  return graph2dot(instance2graph(instance));
}

import { Arrays, assertTrue } from '@rulespace/common';
import { CLit, CVar, CPos, CPred, EqIndexConstraint, ElementOfIndexConstraint } from './constrainer.js';

function termNames(arity)
{
  return Arrays.range(arity).map(i => "t" + i);
}

function valueNames(arity)
{
  return Arrays.range(arity).map(i => `v${i}`);
}

// cloned from rsp2js
function termToString(x)
{
  if (typeof x === 'string')
  {
    return `'${x}'`;
  }
  return String(x); // ???
}

function compileConstraintElementIndex(el, compilePosition)
{
  if (el instanceof CPos)
  {
    return compilePosition(el.indices); // `tuple.${el.indices.map(i => `t${i}`).join('.')}`;
  }
  else if (el instanceof CVar)
  {
    return String(el); // relying on 'v' naming
  }
  else if (el instanceof CLit)
  {
    return termToString(el.value);
  }
  else if (el instanceof CPred)
  {
    return el.pred;
  }
  else
  {
    throw new Error(`cannot handle constraint element ${el} of type ${el?.constructor?.name}`);
  }
}

function compileIndexConstraints(indexConstraints, compilePosition)
{

  function compileConstraint(constraint)
  {
    if (constraint instanceof EqIndexConstraint)
    {
      const left = compileConstraintElementIndex(constraint.left, compilePosition);
      const right = compileConstraintElementIndex(constraint.right, compilePosition);
      return `${left} === ${right}`;
    }
    else if (constraint instanceof ElementOfIndexConstraint)
    {
      const left = compileConstraintElementIndex(constraint.left, compilePosition);
      assertTrue(constraint[2] instanceof CPred);
      const right = compileConstraintElementIndex(constraint.right, compilePosition);
      return `${left} instanceof ${right}`;
    }
    else
    {
      throw new Error(`cannot handle constraint ${constraint} of type ${constraint?.constructor?.name}`);
    }
  }

  return indexConstraints.map(compileConstraint).join(' && ');
}

function compileIndexConstraintAssignments(indexConstraints, compilePosition)
{

  function compileConstraint(constraint)
  {
    if (constraint instanceof EqIndexConstraint
          && constraint.left instanceof CPos
          && constraint.right instanceof CVar)
    {
      const left = compileConstraintElementIndex(constraint.left, compilePosition);
      const right = compileConstraintElementIndex(constraint.right, compilePosition);
      return [`const ${right} = ${left}`];
    }
    else 
    {
      return [];
    }
  }

  return indexConstraints.flatMap(compileConstraint).join('\n');
}

function isStaticIndexConstraint(constraint)
{
    if (constraint instanceof EqIndexConstraint && constraint.right instanceof CLit)
    {
      return true;
    }
    if (constraint instanceof ElementOfIndexConstraint)
    {
      assertTrue(constraint[2] instanceof CPred);
      return true;
    }
    return false;
}

function isDynamicIndexConstraint(constraint)
{
  return !isStaticIndexConstraint(constraint);
}


function relationObjectDeclaration(name, arity, exportName)
{
  const tn = termNames(arity);
  const termAssignments = tn.map(t => `this.${t} = ${t};`);
  const termFields = tn.map(t => `this.${t}`);
 
  return `
function ${exportName(name)}(${termNames(arity).join(', ')})
{
${termAssignments.join('\n  ')}
this._inproducts = new Set(); //TODO not reqd for edb
this._outproducts = new Set();
this._outproductsgb = new Set();
this._refs = []; // TODO: can statically determine which preds will have refs (i.e., allocated as part of tuple) 
}
${name}.prototype.toString = function () {return \`[${name} ${termFields.map(tf => `\${${tf}}`).join(' ')}]\`};
${name}.prototype.name = function () {return '${name}'};
${name}.prototype.values = function () {return [${termFields}]};
${name}.prototype.get = function () { // also internally used
return relation_${name}.get(${termFields})
};
${name}.prototype._remove = function () {
relation_${name}.removeDirect(this)
};
  `;
}


export class RelationEmitter
{
  constructor(name, arity, exportName, logDebug)
  {
    this.name = name;
    this.arity = arity;

    this.exportName = exportName;
    this.logDebug = logDebug;
  }

  // object 

  objectDeclaration()
  {
    return relationObjectDeclaration(this.name, this.arity, this.exportName);
  }

  outProducts(tupleExp)
  {
    return `${tupleExp}._outproducts`;
  }

  addOutProduct(tupleExp, productExp)
  {
    return `${tupleExp}._outproducts.add(${productExp})`
  }  

  // container
  containerDeclaration(indexes)
  {
    return `
    
${indexes.map((idx, i) => `
/* index ${i}: ${idx} */
${new IndexEmitter(idx, `${i}_${this.name}`, this.logDebug).declaration()}
const index${i}_${this.name} = new Index${i}_${this.name}();
`).join('\n')}

class Relation_${this.name} // RelationEmitter.containerDeclaration
{
  constructor()
  {
    this.members = [];
  }

  get(${valueNames(this.arity)})
  {
    for (let i = 0; i < this.members.length; i++)
    {
      const item = this.members[i];
      if (${Arrays.range(this.arity).map(i => `v${i} === item.t${i}`).join(' && ')})
      {
        return item;
      }
    }
    return null;
  }

  addGet(${valueNames(this.arity)})
  {
    const item = this.get(${valueNames(this.arity)});
    if (item === null)
    {
      const newItem = new ${this.name}(${valueNames(this.arity)});
      this.members.push(newItem);
      ${this.logDebug('`+ ${newItem}`')}
      ${indexes.map((idx, i) =>
          (constantPred => constantPred === ''
                            ? `
                            ${this.logDebug(`\`adding \${newItem} to index${i}\``)}
                            index${i}_${this.name}.add(newItem)
                              `
                            : `
                            if (${constantPred})
                            {
                              ${this.logDebug(`\`adding \${newItem} to index${i}\``)}
                              index${i}_${this.name}.add(newItem)
                            }
                           `)(compileIndexConstraints(idx.constraints.filter(isStaticIndexConstraint), indices => [`v${indices[0]}`, ...indices.slice(1).map(i => `t${i}`)].join('.')))).join('\n')}
      return newItem;
    }
    return item;
  }

  add(item)
  {
    this.members.push(item);
    ${indexes.map((idx, i) =>
        (constantPred => constantPred === ''
                          ? `
                          ${this.logDebug(`\`adding \${newItem} to index${i}\``)}
                          index${i}_${this.name}.add(item)
                            `
                          : `
                          if (${constantPred})
                          {
                            ${this.logDebug(`\`adding \${newItem} to index${i}\``)}
                            index${i}_${this.name}.add(item)
                          }
                          `)(compileIndexConstraints(idx.constraints.filter(isStaticIndexConstraint), indices => [`v${indices[0]}`, ...indices.slice(1).map(i => `t${i}`)].join('.')))).join('\n')}
  }

  remove(${valueNames(this.arity)})
  {
    for (let i = 0; i < this.members.length; i++)
    {
      const item = this.members[i];
      if (${Arrays.range(this.arity).map(i => `v${i} === item.t${i}`).join(' && ')})
      {
        this.members.splice(i, 1);
        ${this.logDebug('`- ${item}`')}

        ${indexes.map((idx, i) =>
          (constantPred => constantPred === ''
                            ? `
                            ${this.logDebug(`\`removing \${item} from index${i}\``)}
                            index${i}_${this.name}.remove(item)
                              `
                            : `
                            if (${constantPred})
                            {
                              ${this.logDebug(`\`removing \${item} from index${i}\``)}
                              index${i}_${this.name}.remove(item)
                            }
                           `)(compileIndexConstraints(idx.constraints.filter(isStaticIndexConstraint), indices => [`v${indices[0]}`, ...indices.slice(1).map(i => `t${i}`)].join('.')))).join('\n')}

        return;
      }
    }    
  }

  removeDirect(item)
  {
    // can only 'directly' remove items that still exist!
    const index = this.members.indexOf(item);
    this.members.splice(index, 1);
    ${this.logDebug('`- ${item}`')}
  }

  select()
  {
    return this.members;
  }

  ${
    indexes.map((index, i) => `
      /* ${index} */
      selectIndex${i}(${Arrays.range(index.arity()).map(i => `v${i}`)})
      {
        return index${i}_${this.name}.get(${Arrays.range(index.arity()).map(i => `v${i}`)})
      }
    `).join('\n')
  }

  count()
  {
    return this.members.length;
  }
}

    `;
  }

  instantiate()
  {
    return `new Relation_${this.name}()`;
  }
}

export class NestedMapsRelationEmitter
{
  constructor(name, arity, exportName, logDebug)
  {
    this.name = name;
    this.arity = arity;

    this.exportName = exportName;
    this.logDebug = logDebug;
  }

  // object 

  objectDeclaration()
  {
    return relationObjectDeclaration(this.name, this.arity, this.exportName);
  }

  outProducts(tupleExp)
  {
    return `${tupleExp}._outproducts`;
  }

  outProductsGb(tupleExp)
  {
    return `${tupleExp}._outproductsgb`;
  }

  addOutProduct(tupleExp, productExp)
  {
    return `${tupleExp}._outproducts.add(${productExp})`
  }  

  // container
  containerDeclaration(indexes)
  {
    if (indexes.length !== 0)
    {
      throw new Error('indexes not suppported in this representation');
    }

    return `
    
class Relation_${this.name} // NestedMapsRelationEmitter.containerDeclaration
{
  constructor()
  {
    this.members = new Map();
  }

  get(${valueNames(this.arity)})
  {
    ${nestedMapsGetDeclaration(this.arity)}
  }

  addGet(${valueNames(this.arity)})
  {
    ${nestedMapsAddGetDeclaration(this.arity, tn => `new ${this.name}(${tn.join(', ')})`, this.logDebug)}
  }

  add(item)
  {
    ${nestedMapsAddDeclaration(this.arity, i => `t${i}`, this.logDebug)}
  }

  remove(${valueNames(this.arity)})
  {
    ${nestedMapsRemoveDeclaration(this.arity, this.logDebug)}
  }

  removeDirect(item)
  {
    this.remove(${Arrays.range(this.arity).map(i => `item.t${i}`).join(', ')})    
  }

  count()
  {
    ${nestedMapsCountDeclaration(this.arity, `this.members`)}
  }

  select()
  {
    ${nestedMapsSelectDeclaration(this.arity, `this.members`)}
  }
}

    `;
  }

  instantiate()
  {
    return `new Relation_${this.name}()`;
  }
}


export class RelationEmitter0 // arity 0
{
  constructor(name, exportName, logDebug)
  {
    this.name = name;
    this.exportName = exportName;
    this.logDebug = logDebug;
  }

  // object 

  objectDeclaration()
  {
    return relationObjectDeclaration(this.name, this.arity, this.exportName);
  }

  outProducts(tupleExp)
  {
    return `${tupleExp}._outproducts`;
  }

  addOutProduct(tupleExp, productExp)
  {
    return `${tupleExp}._outproducts.add(${productExp})`
  }  

  // container

  containerDeclaration()
  {
    return `
      
class Relation_${this.name}
{
  constructor()
  {
    this.member = null;
  }

  get()
  {
    return this.member;
  }

  addGet()
  {
    const item = this.get();
    if (item === null)
    {
      const newItem = new ${this.name}();
      this.member = newItem;
      ${this.logDebug('`+ ${newItem}`')}
      return newItem;
    }
    return item;
  }

  add(item)
  {
    this.member = item;
  }

  remove()
  {
    ${this.logDebug('`removed ${this.member} from members`')}
    this.member = null;
  }    

  removeDirect(item)
  {
    // in principle, this is only reached 'internally', so you cannot remove item that was not first selected
    // so: assert that this.member === item
    this.member = null;
    ${this.logDebug('`- ${item}`')}
  }

  select()
  {
    return this.member === null ? [] : [this.member];
  }

  count()
  {
    return this.member === null ? 0 : 1;
  }
}

    `;
  }

  instantiate()
  {
    return `new Relation_${this.name}()`;
  }
}


function functorObjectDeclaration(name, arity, exportName)
{
  const tn = termNames(arity);
  const termAssignments = tn.map(t => `this.${t} = ${t};`);
  const termFields = tn.map(t => `this.${t}`);

  // TODO: when are outproducts ever used on a functor?
  return `
  function ${exportName(name)}(${tn.join(', ')})
  {
    ${termAssignments.join('\n  ')}
    this._rc = 0;
    this._outproducts = new Set();
    this._outproductsgb = new Set();
    this._refs = [];
  }
  ${name}.prototype.toString = function () {return atomString("${name}", ${termFields.join(', ')})};
  ${name}.prototype.name = function () {return '${name}'};
  ${name}.prototype.values = function () {return [${termFields}]};
  ${name}.prototype._remove = function () { functor_${name}.removeDirect(this) };    
  `;
}

export class FunctorEmitter
{
  constructor(name, arity, exportName, logDebug)
  {
    this.name = name;
    this.arity = arity;

    this.exportName = exportName;
    this.logDebug = logDebug;
  }


  // object

  objectDeclaration()
  {
    return functorObjectDeclaration(this.name, this.arity, this.exportName);
  }  

  //container

  containerDeclaration()
  {
    return `
      
class Functor_${this.name}
{
  constructor()
  {
    this.members = [];
  }

  get(${valueNames(this.arity)})
  {
    for (let i = 0; i < this.members.length; i++)
    {
      const item = this.members[i];
      if (${Arrays.range(this.arity).map(i => `v${i} === item.t${i}`).join(' && ')})
      {
        return item;
      }
    }
    return null;
  }

  addGet(${valueNames(this.arity)})
  {
    const item = this.get(${valueNames(this.arity)});
    if (item === null)
    {
      const newItem = new ${this.name}(${valueNames(this.arity)});
      this.members.push(newItem);
      ${this.logDebug('`+ ${newItem}`')}
      return newItem;
    }
    return item;
  }

  add(item)
  {
    this.members.push(item);
  }

  remove(${valueNames(this.arity)})
  {
    for (let i = 0; i < this.members.length; i++)
    {
      const item = this.members[i];
      if (${Arrays.range(this.arity).map(i => `v${i} === item.t${i}`).join(' && ')})
      {
        this.members.splice(i, 1);
        ${this.logDebug('`- ${item}`')}
        return;
      }
    }    
  }

  removeDirect(item)
  {
    // can only 'directly' remove items that still exist!
    const index = this.members.indexOf(item);
    this.members.splice(index, 1);
    ${this.logDebug('`- ${item}`')}
  }

  count()
  {
    return this.members.length;
  }
}

    `;
  }

  instantiate()
  {
    return `new Functor_${this.name}()`;
  }
}

export class FunctorEmitter0 // arity 0
{
  constructor(name, exportName, logDebug)
  {
    this.name = name;
    this.exportName = exportName;
    this.logDebug = logDebug;
  }

  // object

  objectDeclaration()
  {
    return functorObjectDeclaration(this.name, 0, this.exportName);
  }  

  // container

  containerDeclaration()
  {
    return `
      
class Functor_${this.name}
{
  constructor()
  {
    this.member = null;
  }

  get()
  {
    return this.member;
  }

  addGet()
  {
    const item = this.get();
    if (item === null)
    {
      const newItem = new ${this.name}();
      this.member = newItem;
      ${this.logDebug('`+ ${newItem}`')}
      return newItem;
    }
    return item;
  }

  add(item)
  {
    this.member = item;
  }

  remove()
  {
    const item = this.get();
    if (item === null)
    {
      return;
    }
    this.member = null;
    ${this.logDebug('`- ${item}`')}
  }    

  removeDirect(item)
  {
    // in principle, this is only reached 'internally', so you cannot remove item that was not first selected
    // so: assert that this.member === item
    this.member = null;
    ${this.logDebug('`- ${item}`')}
  }

  count()
  {
    return this.member === null ? 0 : 1;
  }
}

    `;
  }

  instantiate()
  {
    return `new Functor_${this.name}()`;
  }
}



export class ClosureEmitter
{
  constructor(name, arity, logDebug)
  {
    this.name = name;
    this.arity = arity;

    this.logDebug = logDebug;
  }

  // container
  containerDeclaration()
  {
    return `
      
class Closure_${this.name}
{
  constructor()
  {
    this.members = [];
  }

  get(${valueNames(this.arity)})
  {
    for (let i = 0; i < this.members.length; i++)
    {
      const item = this.members[i];
      if (${Arrays.range(this.arity).map(i => `v${i} === item.t${i}`).join(' && ')})
      {
        return item;
      }
    }
    return null;
  }

  addGet(${valueNames(this.arity)})
  {
    const item = this.get(${valueNames(this.arity)});
    if (item === null)
    {
      const newItem = new ${this.name}(${valueNames(this.arity)});
      this.members.push(newItem);
      ${this.logDebug('`+ ${newItem}`')}
      return newItem;
    }
    return item;
  }

  add(item)
  {
    this.members.push(item);
  }

  remove(${valueNames(this.arity)})
  {
    for (let i = 0; i < this.members.length; i++)
    {
      const item = this.members[i];
      if (${Arrays.range(this.arity).map(i => `v${i} === item.t${i}`).join(' && ')})
      {
        this.members.splice(i, 1);
        ${this.logDebug('`- ${item}`')}
        return;
      }
    }    
  }

  removeDirect(item)
  {
    // can only 'directly' remove items that still exist!
    const index = this.members.indexOf(item);
    this.members.splice(index, 1);
    ${this.logDebug('`- ${item}`')}
  }

  count()
  {
    return this.members.length;
  }
}

    `;
  }

  instantiate()
  {
    return `new Closure_${this.name}()`;
  }
}

export class ClosureEmitter0 // arity 0
{
  constructor(name, logDebug)
  {
    this.name = name;
    this.logDebug = logDebug;
  }

  declaration()
  {
    return `
      
class Closure_${this.name}
{
  constructor()
  {
    this.member = null;
  }

  get()
  {
    return this.member;
  }

  addGet()
  {
    const item = this.get();
    if (item === null)
    {
      const newItem = new ${this.name}();
      this.member = newItem;
      ${this.logDebug('`+ ${newItem}`')}
      return newItem;
    }
    return item;
  }

  add(item)
  {
    this.member = item;
  }

  remove()
  {
    const item = this.get();
    if (item === null)
    {
      return;
    }
    this.member = null;
    ${this.logDebug('`- ${item}`')}
  }    

  removeDirect(item)
  {
    // in principle, this is only reached 'internally', so you cannot remove item that was not first selected
    // so: assert that this.member === item
    this.member = null;
    ${this.logDebug('`- ${item}`')}
  }

  count()
  {
    return this.member === null ? 0 : 1;
  }
}

    `;
  }

  instantiate()
  {
    return `new Closure_${this.name}()`;
  }
}


export class IndexEmitter
{
  constructor(index, name, logDebug)
  {
    this.index = index;
    this.name = name;

    this.logDebug = logDebug;
  }

  declaration()
  {
    const maps = [`this.members`].concat(Arrays.range(this.index.arity()).map(i => "l" + i));
    const vn = valueNames(this.index.arity()); // arity also determined by constraints

    const getBody = [];
    for (let i = 0; i < this.index.arity(); i++)
    {
      getBody.push(`
      const ${maps[i+1]} = ${maps[i]}.get(${vn[i]});
      if (${maps[i+1]} === undefined)
      {
        return [];
      }
      `)
    }
    getBody.push(`return ${maps[this.index.arity()]};`);


    function emitEntry(i, arity)
    {
      if (i === arity)
      {
        return `tuples`;
      }
      return `new Map([[v${i}, ${emitEntry(i+1, arity)}]])`;
    }
    const addBody = [compileIndexConstraintAssignments(this.index.constraints, indices => `tuple.${indices.map(i => `t${i}`).join('.')}`)];
    for (let i = 0; i < this.index.arity(); i++)
    {
      addBody.push(`
      const ${maps[i+1]} = ${maps[i]}.get(${vn[i]});
      if (${maps[i+1]} === undefined)
      {
        const tuples = [tuple];
        ${maps[i]}.set(${vn[i]}, ${emitEntry(i+1, this.index.arity())});
        ${this.logDebug(`\`Index${this.name}: addGet added \${tuple} to members\``)}
        return;
      }
      `)
    }
    addBody.push(`${maps[this.index.arity()]}.push(tuple);`);

    const removeBody = [compileIndexConstraintAssignments(this.index.constraints, indices => `tuple.${indices.map(i => `t${i}`).join('.')}`)];
    for (let i = 0; i < this.index.arity(); i++)
    {
      removeBody.push(`
      const ${maps[i+1]} = ${maps[i]}.get(${vn[i]});
      `)
    }
    removeBody.push(`
    ${maps[this.index.arity()]}.splice(${maps[this.index.arity()]}.indexOf(tuple), 1)
    `);  

    function emitLookup(i, arity)
    {
      if (i === arity)
      {
        return `result.push(...${maps[arity]})`;
      }
      return `
        for (const ${maps[i+1]} of ${maps[i]}.values())
        {
          if (${maps[i+1]} !== undefined)
          {
            ${emitLookup(i+1, arity)}
          }
        }
        `;
    }

    function emitCount(i, arity)
    {
      if (i === arity)
      {
        return `${maps[i]}.length`;
      }
      return `[...${maps[i]}.values()].reduce((acc, ${maps[i+1]}) => acc += ${emitCount(i+1, arity)}, 0)`;
    }
    const countBody = `return ${emitCount(0, this.index.arity())}`

    return `
      
class Index${this.name}
{
  constructor()
  {
    this.members = ${this.index.arity() === 0 ? `[]` : `new Map()`};
  }

  get(${vn})
  {
    ${getBody.join('\n')}
  }

  add(tuple)
  {
    ${addBody.join('\n')}
  }

  remove(tuple)
  {
    ${removeBody.join('\n')}
  }

  count()
  {
    ${countBody}
  }
}

    `;
  }

  instantiate()
  {
    return `new Functor_${this.name}()`;
  }
}


function productObjectDeclaration(name, arity, recursive) // TODO: remove recursive at some point
{
  const tupleParams = Arrays.range(arity).map(i => `tuple${i}`);
  const tupleFieldInits = Array.from(tupleParams, tp => `this.${tp} = ${tp};`);
  const tupleFields = Array.from(tupleParams, tp => `this.${tp}`);

  return `
class ${name}_Product // productObjectDeclaration
{
  constructor(${tupleParams.join(', ')})
  {
    ${tupleFieldInits.join('\n')}
    this._outtuple = null; // TODO make this ctr param!
  }

  // result of a recursive rule?
  recursive()
  {
    return ${recursive};
  }

  tuples() // or, a field initialized in ctr?
  {
    return [${tupleFields.join(', ')}];
  }

  _remove() // hard coded dep on 'global'
  {
    product_${name}.removeDirect(this);
  }

  toString()
  {
    return "${name}:" + this.tuples().join('.');
  }
}
  `;    
}


export class ProductEmitter
{
  constructor(name, arity, recursive, logDebug)
  {
    this.name = name;
    this.arity = arity;
    this.recursive = recursive;
 
    this.logDebug = logDebug;
  }

  // object
  objectDeclaration()
  {
    return productObjectDeclaration(this.name, this.arity, this.recursive);
  }

  // container
  containerDeclaration()
  {
    return `
    
class Product_${this.name}
{
  constructor()
  {
    this.members = [];
  }

  get(${valueNames(this.arity)})
  {
    for (let i = 0; i < this.members.length; i++)
    {
      const item = this.members[i];
      if (${Arrays.range(this.arity).map(i => `v${i} === item.t${i}`).join(' && ')})
      {
        return item;
      }
    }
    return null;
  }

  addGet(${valueNames(this.arity)})
  {
    const item = this.get(${valueNames(this.arity)});
    if (item === null)
    {
      const newItem = new ${this.name}_Product(${valueNames(this.arity)});
      this.members.push(newItem);
      ${this.logDebug('`+ ${newItem}`')}
      return newItem;
    }
    return item;
  }

  add(item)
  {
    this.members.push(item);
  }

  remove(${valueNames(this.arity)})
  {
    for (let i = 0; i < this.members.length; i++)
    {
      const item = this.members[i];
      if (${Arrays.range(this.arity).map(i => `v${i} === item.t${i}`).join(' && ')})
      {
        this.members.splice(i, 1);
        ${this.logDebug('`- ${item}`')}
        return;
      }
    }    
  }

  removeDirect(item)
  {
    // can only 'directly' remove items that still exist!
    const index = this.members.indexOf(item);
    this.members.splice(index, 1);
    ${this.logDebug('`- ${item}`')}
  }

  count()
  {
    return this.members.length;
  }
}

    `;
  }

  instantiate()
  {
    return `new Product_${this.name}()`; 
  }
}

function nestedMapsGetDeclaration(arity)
{
  const sb = [];
  const maps = [`this.members`].concat(Arrays.range(arity).map(i => "l" + i));
  for (let i = 0; i < arity; i++)
  {
    sb.push(`
    const ${maps[i+1]} = ${maps[i]}.get(v${i});
    if (${maps[i+1]} === undefined)
    {
      return null;
    }
    `)
  }
  sb.push(`return ${maps[arity]};`);
  return sb.join('\n');
}

function nestedMapsAddGetDeclaration(arity, instantiateExpGen, logDebug)
{
  function emitEntry(i)
  {
    if (i === arity)
    {
      return `tuple`;
    }
    return `new Map([[${tn[i]}, ${emitEntry(i+1)}]])`;
  }

  const sb = [];
  const tn = valueNames(arity);
  const maps = [`this.members`].concat(Arrays.range(arity).map(i => "l" + i));
  for (let i = 0; i < arity; i++)
  {
    sb.push(`
    const ${maps[i+1]} = ${maps[i]}.get(${tn[i]});
    if (${maps[i+1]} === undefined)
    {
      const tuple = ${instantiateExpGen(tn)};
      ${maps[i]}.set(${tn[i]}, ${emitEntry(i+1)});
      ${logDebug(`\`+ \${tuple}\``)}
      return tuple;
    }
    `)
  }
  sb.push(`return ${maps[arity]};`);
  return sb.join('\n');
}

function nestedMapsAddDeclaration(arity, fieldAccessExpGen, logDebug)
{
  function emitEntry(i)
  {
    if (i === arity)
    {
      return `item`;
    }
    return `new Map([[item.${fieldAccessExpGen(i)}, ${emitEntry(i+1)}]])`;
  }

  const sb = [];
  const maps = [`this.members`].concat(Arrays.range(arity).map(i => "l" + i));
  for (let i = 0; i < arity; i++)
  {
    sb.push(`
    const ${maps[i+1]} = ${maps[i]}.get(item.${fieldAccessExpGen(i)});
    if (${maps[i+1]} === undefined)
    {
      ${maps[i]}.set(item.${fieldAccessExpGen(i)}, ${emitEntry(i+1)});
      ${logDebug(`\`add added \${item} to members\``)}
      return;
    }
    `)
  }
  sb.push(`return ${maps[arity]};`);
  return sb.join('\n');
}

function nestedMapsRemoveDeclaration(arity, logDebug)
{
  const sb = [];
  const tn = valueNames(arity);
  const maps = [`this.members`].concat(Arrays.range(arity).map(i => "l" + i));
  for (let i = 0; i < arity-1; i++)
  {
    sb.push(`
    const ${maps[i+1]} = ${maps[i]}.get(${tn[i]});
    `)
  }
  sb.push(logDebug(`\`- \${${maps[arity - 1]}.get(${tn[arity-1]})}\``));
  sb.push(`
  ${maps[arity - 1]}.delete(${tn[arity-1]});`);  
  return sb.join('\n');
}

function nestedMapsSelectDeclaration(arity, rootExp)
{

  function emitLookup(i)
  {
    if (i === arity)
    {
      return `result.push(${maps[arity]})`;
    }
    return `
      for (const ${maps[i+1]} of ${maps[i]}.values())
      {
        if (${maps[i+1]} !== undefined)
        {
          ${emitLookup(i+1)}
        }
      }
      `;
  }

  const maps = [rootExp].concat(Arrays.range(arity).map(i => "l" + i));

  return `
  const result = [];
  ${emitLookup(0)}
  return result;
  `;
}

function nestedMapsCountDeclaration(arity, rootExp)
{

  function emitCount(i)
  {
    if (i === arity)
    {
      return `1`;
    }
    return `[...${maps[i]}.values()].reduce((acc, ${maps[i+1]}) => acc += ${emitCount(i+1)}, 0)`;
  }

  const maps = [rootExp].concat(Arrays.range(arity).map(i => "l" + i));

  return `return ${emitCount(0)};
  `;
}


export class NestedMapsProductEmitter
{
  constructor(name, arity, recursive, logDebug)
  {
    this.name = name;
    this.arity = arity;
    this.recursive = recursive;
 
    this.logDebug = logDebug;
  }

  // object
  objectDeclaration()
  {
    return productObjectDeclaration(this.name, this.arity, this.recursive);
  }

  // container
  containerDeclaration()
  {
    return `
    
class Product_${this.name} // NestedMapsProductEmitter.containerDeclaration
{
  constructor()
  {
    this.members = new Map();
  }

  get(${valueNames(this.arity)})
  {
    ${nestedMapsGetDeclaration(this.arity)}
  }

  addGet(${valueNames(this.arity)})
  {
    ${nestedMapsAddGetDeclaration(this.arity, tn => `new ${this.name}_Product(${tn.join(', ')})`, this.logDebug)}
  }

  add(item)
  {
    ${nestedMapsAddDeclaration(this.arity, i => `tuple${i}`, this.logDebug)}
  }

  remove(${valueNames(this.arity)})
  {
    ${nestedMapsRemoveDeclaration(this.arity, this.logDebug)}
  }

  removeDirect(item)
  {
    this.remove(${Arrays.range(this.arity).map(i => `item.tuple${i}`).join(', ')})    
  }

  count()
  {
    ${nestedMapsCountDeclaration(this.arity, `this.members`)}
  }
}

    `;
  }

  instantiate()
  {
    return `new Product_${this.name}()`; 
  }
}


function productGBObjectDeclaration(name, arity)
{
    const tupleParams = Arrays.range(arity).map(i => `tuple${i}`);
    const tupleFieldInits = Array.from(tupleParams, tp => `this.${tp} = ${tp};`);
    const tupleFields = Array.from(tupleParams, tp => `this.${tp}`);
  
    return `
class ${name}_ProductGB // productGBObjectDeclaration
{
  constructor(${tupleParams.join(', ')})
  {
    ${tupleFieldInits.join('\n')}
    this.value = null; // TODO ctr param? (is func dep on tuples + complicates addGet)
    this._outgb = null;  // TODO ctr param? (complicates addGet)
  }

  tuples() // or, a field initialized in ctr?
  {
    return [${tupleFields.join(', ')}];
  }

  _remove() // hard coded dep on 'global'
  {
    productGB_${name}.removeDirect(this);
  }

  toString()
  {
    return "${name}:" + this.tuples().join('.');
  }
}
  `;    
}


export class ProductGBEmitter
{
  constructor(name, arity, logDebug)
  {
    this.name = name;
    this.arity = arity;
 
    this.logDebug = logDebug;
  }

  // object
  objectDeclaration()
  {
    return productGBObjectDeclaration(this.name, this.arity);
  }


  // container
  containerDeclaration()
  {
    return `
    

class ProductGB_${this.name}
{
  constructor()
  {
    this.members = [];
  }

  get(${valueNames(this.arity)})
  {
    for (let i = 0; i < this.members.length; i++)
    {
      const item = this.members[i];
      if (${Arrays.range(this.arity).map(i => `v${i} === item.tuple${i}`).join(' && ')})
      {
        return item;
      }
    }
    return null;
  }

  addGet(${valueNames(this.arity)})
  {
    const item = this.get(${valueNames(this.arity)});
    if (item === null)
    {
      const newItem = new ${this.name}_ProductGB(${valueNames(this.arity)});
      this.members.push(newItem);
      ${this.logDebug('`+ ${newItem}`')}
      return newItem;
    }
    return item;
  }

  add(item)
  {
    this.members.push(item);
  }

  remove(${valueNames(this.arity)})
  {
    for (let i = 0; i < this.members.length; i++)
    {
      const item = this.members[i];
      if (${Arrays.range(this.arity).map(i => `v${i} === item.t${i}`).join(' && ')})
      {
        this.members.splice(i, 1);
        ${this.logDebug('`- ${item}`')}
        return;
      }
    }    
  }

  removeDirect(item)
  {
    // can only 'directly' remove items that still exist!
    const index = this.members.indexOf(item);
    this.members.splice(index, 1);
    ${this.logDebug('`- ${item}`')}
  }

  count()
  {
    return this.members.length;
  }
}

    `;
  }

  instantiate()
  {
    return `new ProductGB_${this.name}()`;
  }
}


function groupByObjectDeclaration(name, arity)
{
  const tn = termNames(arity);
  const termAssignments = tn.map(t => `this.${t} = ${t}`);
  const termFields = tn.map(t => `this.${t}`);

  return `
class ${name}_GB // groupByObjectDeclaration
{
  constructor(${tn.join(', ')})
  {
    ${termAssignments.join('; ')};
    this._inproductsgb = new Set();
    this._outtuple = null;  
  }

  toString()
  {
    return \`[${name}_GB ${termFields.map(tf => `\${${tf}}`).join(' ')}]\`;
  }
}
    `;    
}


export class GroupByEmitter
{

  constructor(name, arity, logDebug)
  {
    this.name = name;
    this.arity = arity;
    this.logDebug = logDebug;
  }

  // object

  objectDeclaration()
  {
    return groupByObjectDeclaration(this.name, this.arity);
  }

  // container
  containerDeclaration()
  {
    return `
      
class GroupBy_${this.name} // GroupByEmitter.containerDeclaration
{
  constructor()
  {
    this.members = [];
  }

  get(${valueNames(this.arity)})
  {
    for (let i = 0; i < this.members.length; i++)
    {
      const item = this.members[i];
      if (${Arrays.range(this.arity).map(i => `v${i} === item.t${i}`).join(' && ')})
      {
        return item;
      }
    }
    return null;
  }

  addGet(${valueNames(this.arity)})
  {
    const item = this.get(${valueNames(this.arity)});
    if (item === null)
    {
      const newItem = new ${this.name}_GB(${valueNames(this.arity)});
      this.members.push(newItem);
      ${this.logDebug('`+ ${newItem}`')}
      return newItem;
    }
    return item;
  }

  add(item)
  {
    this.members.push(item);
  }

  remove(${valueNames(this.arity)})
  {
    for (let i = 0; i < this.members.length; i++)
    {
      const item = this.members[i];
      if (${Arrays.range(this.arity).map(i => `v${i} === item.t${i}`).join(' && ')})
      {
        this.members.splice(i, 1);
        ${this.logDebug('`- ${item}`')}
        return;
      }
    }    
  }

  removeDirect(item)
  {
    // can only 'directly' remove items that still exist!
    const index = this.members.indexOf(item);
    this.members.splice(index, 1);
    ${this.logDebug('`- ${item}`')}
  }

  count()
  {
    return this.members.length;
  }
}

    `;
  }

  instantiate()
  {
    return `new GroupBy_${this.name}()`;
  }
}


export class GroupByEmitter0
{

  constructor(name, logDebug)
  {
    this.name = name;
    this.logDebug = logDebug;
  }

  // object

  objectDeclaration()
  {
    return groupByObjectDeclaration(this.name, 0);
  }

  // container
  containerDeclaration()
  {
    return `
      
class GroupBy_${this.name} // GroupByEmitter0.containerDeclaration
{
  constructor()
  {
    this.member = null;
  }

  get()
  {
    return this.member;
  }

  addGet()
  {
    const item = this.get();
    if (item === null)
    {
      const newItem = new ${this.name}_GB();
      this.member = newItem;
      ${this.logDebug('`+ ${newItem}`')}
      return newItem;
    }
    return item;
  }

  add(item)
  {
    this.member = newItem;
  }

  remove()
  {
    const item = this.get();
    if (item === null)
    {
      return;
    }
    this.member = null;
    ${this.logDebug('`- ${item}`')}
  }    

  removeDirect(item)
  {
    // in principle, this is only reached 'internally', so you cannot remove item that was not first selected
    // so: assert that this.member === item
    this.member = null;
    ${this.logDebug('`- ${item}`')}
  }

  count()
  {
    return this.member === null ? 0 : 1;
  }
}

    `;
  }

  instantiate()
  {
    return `new GroupBy_${this.name}()`;
  }
}
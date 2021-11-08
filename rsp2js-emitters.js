import { Arrays, assertTrue } from '@rulespace/common';

function termNames(arity)
{
  return Arrays.range(arity).map(i => "t" + i);
}

class TupleContainerEmitter
{
  constructor(logDebug)
  {
    this.logDebug = logDebug;
  }

  containerDeclaration(pred, arity)
  {
    if (arity === 0)
    {
      return `let ${pred}_member = null`;
    }
    return `const ${pred}_members = ${this.emptyDecl_()}`;
  }

  countDeclaration(pred, arity)
  {
    return `
  function count_${pred}()
  {
    ${arity === 0
        ? `return ${pred}_member === null ? 0 : 1`
        : this.countDecl_(pred, arity)}
  }
    `;
  }

  count(pred)
  {
    return `count_${pred}()`;
  }

  getDeclaration(pred, arity)
  {
    const tn = termNames(arity);
    const sb = [];
    sb.push(`
function get_${pred}(${tn.join(', ')})
{
    `);
    if (arity === 0)
    {
      sb.push(`return ${pred}_member;`);
    }
    else
    {
      sb.push(this.getDecl_(pred, arity))
    }
    sb.push(`}`);
    return sb.join('\n');
  }

  get(pred, fieldValues)
  {
    return `get_${pred}(${fieldValues.join(', ')})`;
  }

  addGetDeclaration(pred, arity)
  {
    const tn = termNames(arity);
    const sb = [];
    sb.push(`
function add_get_${pred}(${tn.join(', ')})
{
    `);

    if (arity === 0)
    {
      sb.push(`
        if (${pred}_member === null)
        {
          ${pred}_member = new ${pred}(${tn.join(', ')});
          ${this.logDebug(`\`addGet added ${pred}(${tn.map(t => `\${${t}}`)}) to members\``)}
        }
        return ${pred}_member;
        `);
    }
    else
    {
      sb.push(this.addGetDecl_(pred, arity));
    }
    sb.push(`}`);
    return sb.join('\n');
  }

  addGet(pred, fieldValues)
  {
    return `add_get_${pred}(${fieldValues.join(', ')})`;
  }


  removeDeclaration(pred, arity)
  {
    const tn = termNames(arity);
    const sb = [];
    sb.push(`
function remove_${pred}(${tn.join(', ')})
{
    `);
    if (arity === 0)
    {
      sb.push(`${pred}_member = null;`);
    }
    else
    {
      sb.push(this.removeDecl_(pred, arity));
    }
    sb.push(`}`);
    return sb.join('\n');
  }

  removeDirectDeclaration(pred, arity)
  {
    const sb = [];
    sb.push(`
function removeDirect_${pred}(item)
{
    `);
    if (arity === 0)
    {
      // in principle, at this point (reached 'internally') you cannot remove item that was not first selected
      // TODO: add assert that ${pred}_member === item
      sb.push(`${pred}_member = null;`);
    }
    else
    {
      sb.push(this.removeDirectDecl_(pred));
    }
    sb.push(`}`);
    return sb.join('\n');
  }

  remove(pred, fieldValues)
  {
    return `remove_${pred}(${fieldValues.join(', ')})`;
  }

  removeDirect(pred, itemExp)
  {
    return `removeDirect_${pred}(${itemExp})`;
  }

  selectDeclaration(pred, arity)
  {
    if (arity === 0)
    {
      return `
function select_${pred}()
{
    return ${pred}_member === null ? [] : [${pred}_member];
}
    `;      
    }
    
    return `
function select_${pred}()
{
  ${this.selectDecl_(pred, arity)}
}
    `;
  }

  select(pred)
  {
    return `select_${pred}()`;
  }
}

export class SimpleArray extends TupleContainerEmitter
{
  constructor(logDebug)
  {
    super(logDebug);
  }

  emptyDecl_()
  {
    return `[]`;
  }

  getDecl_(pred, arity)
  {
    return `
      for (let i = 0; i < ${pred}_members.length; i++)
      {
        const item = ${pred}_members[i];
        if (${Arrays.range(arity).map(i => `t${i} === item.t${i}`).join(' && ')})
        {
          return item;
        }
      }
      return null;
    `;
  }

  addGetDecl_(pred, arity)
  {
    return `
      const item = ${this.get(pred, termNames(arity))};
      if (item === null)
      {
        const newItem = new ${pred}(${termNames(arity)});
        ${pred}_members.push(newItem);
        return newItem
      }
      return item;
    `;
  }

  removeDecl_(pred, arity)
  {
    return `
      for (let i = 0; i < ${pred}_members.length; i++)
      {
        const item = ${pred}_members[i];
        if (${Arrays.range(arity).map(i => `t${i} === item.t${i}`).join(' && ')})
        {
          ${pred}_members.splice(i, 1);
          ${this.logDebug(`\`removed \${item} from members\``)}
          return;
        }
      }
  `;
  }

  removeDirectDecl_(pred)
  {
    return `
      const index = ${pred}_members.indexOf(item);
      ${pred}_members.splice(index, 1);
    `;
  }

  selectDecl_(pred, arity)
  {
    return `
      return ${pred}_members;
    `;
  }

  countDecl_(pred)
  {
    return `return ${pred}_members.length`;
  }

}



export class NestedMaps extends TupleContainerEmitter
{
  constructor(logDebug)
  {
    super(logDebug);
  }

  emptyDecl_()
  {
    return `new Map()`;
  }

  getDecl_(pred, arity)
  {
    const sb = [];
    const maps = [`${pred}_members`].concat(Arrays.range(arity).map(i => "l" + i));
    for (let i = 0; i < arity; i++)
    {
      sb.push(`
      const ${maps[i+1]} = ${maps[i]}.get(t${i});
      if (${maps[i+1]} === undefined)
      {
        return null;
      }
      `)
    }
    sb.push(`return ${maps[arity]};`);
    return sb.join('\n');
  }

  addGetDecl_(pred, arity)
  {
    function emitEntry(i)
    {
      if (i === arity)
      {
        return `tuple`;
      }
      return `new Map([[t${i}, ${emitEntry(i+1)}]])`;
    }

    const sb = [];
    const tn = termNames(arity);
    const maps = [`${pred}_members`].concat(Arrays.range(arity).map(i => "l" + i));
    for (let i = 0; i < arity; i++)
    {
      sb.push(`
      const ${maps[i+1]} = ${maps[i]}.get(t${i});
      if (${maps[i+1]} === undefined)
      {
        const tuple = new ${pred}(${tn.join(', ')});
        ${maps[i]}.set(t${i}, ${emitEntry(i+1)});
        ${this.logDebug(`\`addGet added ${pred}(${tn.map(t => `\${${t}}`)}) to members\``)}
        return tuple;
      }
      `)
    }
    sb.push(`return ${maps[arity]};`);
    return sb.join('\n');
  }

  removeDecl_(pred, arity)
  {
    const sb = [];
    const maps = [`${pred}_members`].concat(Arrays.range(arity).map(i => "l" + i));
    for (let i = 0; i < arity-1; i++)
    {
      sb.push(`
      const ${maps[i+1]} = ${maps[i]}.get(t${i});
      `)
    }
    sb.push(`
    ${maps[arity - 1]}.delete(t${arity-1});`);  
    return sb.join('\n');
  }

  selectDecl_(pred, arity)
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

    const maps = [`${pred}_members`].concat(Arrays.range(arity).map(i => "l" + i));

    return `
    const result = [];
    ${emitLookup(0)}
    return result;
    `;
  }

  countDecl_(pred, arity)
  {

    function emitCount(i)
    {
      if (i === arity)
      {
        return `1`;
      }
      return `[...${maps[i]}.values()].reduce((acc, ${maps[i+1]}) => acc += ${emitCount(i+1)}, 0)`;
    }

    const maps = [`${pred}_members`].concat(Arrays.range(arity).map(i => "l" + i));

    return `return ${emitCount(0)};
    `;
  }
}

class TupleEmitter
{
  constructor()
  {
  }


}

export class RelationConstructorEmitter extends TupleEmitter
{
  constructor(publicFunction)
  {
    super();
    this.publicFunction = publicFunction;
  }

  objectDeclaration(pred, arity)
  {
    const tn = termNames(arity);
    const termAssignments = tn.map(t => `this.${t} = ${t};`);
    const termFields = tn.map(t => `this.${t}`);
   
    return `
${this.publicFunction(pred)}(${termNames(arity).join(', ')})
{
  ${termAssignments.join('\n  ')}
  this._inproducts = ${pred.edb ? `new Set(); //TODO will/should never be added to` : `new Set();`}
  this._outproducts = new Set();
  this._outproductsgb = new Set();
  this._refs = []; // TODO: can statically determine which preds will have refs (i.e., allocated as part of tuple) 
}
${pred}.prototype.toString = function () {return \`[${pred} ${termFields.map(tf => `\${${tf}}`).join(' ')}]\`};
${pred}.prototype.values = function () {return [${termFields}]};
${pred}.prototype.get = function () { // also internally used
  return relation_${pred}.get(${termFields})
};
${pred}.prototype._remove = function () {
  relation_${pred}.removeDirect(this)
};
  `;
  }

  outProducts(tupleExp)
  {
    return `${tupleExp}._outproducts`;
  }

  addOutProduct(tupleExp, productExp)
  {
    return `${tupleExp}._outproducts.add(${productExp})`
  }
}

export class FunctorConstructorEmitter extends RelationConstructorEmitter
{
  constructor(publicFunction)
  {
    super(publicFunction);
  }

  objectDeclaration(functor, arity)
  {
    const tn = termNames(arity);
    const termAssignments = tn.map(t => `this.${t} = ${t};`);
    const termFields = tn.map(t => `this.${t}`);

    return `
    ${this.publicFunction(functor)}(${tn.join(', ')})
    {
      ${termAssignments.join('\n  ')}
      this._rc = 0;
      this._outproducts = new Set();
      this._outproductsgb = new Set();
      this._refs = [];
    }
    ${functor}.prototype.toString = function () {return atomString("${functor}", ${termFields.join(', ')})};
    ${functor}.prototype.values = function () {return [${termFields}]};
    ${functor}.prototype._remove = function () { functor_${functor}.removeDirect(this) };    
    `;
  }
}

export class ProductClassEmitter extends TupleEmitter
{
  constructor()
  {
    super();
  }

  objectDeclaration(name, arity, recursive, tce) // TODO: remove recursive at some point
  {
    const tupleParams = Arrays.range(arity).map(i => `tuple${i}`);
    const tupleFieldInits = Array.from(tupleParams, tp => `this.${tp} = ${tp};`);
    const tupleFields = Array.from(tupleParams, tp => `this.${tp}`);
  
    return `
class ${name}
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

  _remove()
  {
    ${tce.remove(name, tupleFields)};
  }

  toString()
  {
    return "${name}:" + this.tuples().join('.');
  }
}
  `;    
  }
}

export class ProductGBClassEmitter extends TupleEmitter
{
  constructor()
  {
    super();
  }

  objectDeclaration(name, arity)
  {
    const tupleParams = Arrays.range(arity).map(i => `tuple${i}`);
    const tupleFieldInits = Array.from(tupleParams, tp => `this.${tp} = ${tp};`);
    const tupleFields = Array.from(tupleParams, tp => `this.${tp}`);
  
    return `
class ${name}
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

  toString()
  {
    return "${name}:" + this.tuples().join('.');
  }
}
  `;    
  }
}


export class GBClassEmitter extends TupleEmitter
{
  constructor()
  {
    super();
  }

  objectDeclaration(name, arity)
  {
    const tn = termNames(arity);
    const termAssignments = tn.map(t => `this.${t} = ${t}`);
    const termFields = tn.map(t => `this.${t}`);
  
    return `
class ${name}
{
  constructor(${tn.join(', ')})
  {
    ${termAssignments.join('; ')};
    this._outtuple = null;  
  }

  toString()
  {
    return atomString('${name}', ${termFields.join(', ')});
  }
}
      `;    
  }
}









function valueNames(arity)
{
  return Arrays.range(arity).map(i => `v${i}`);
}





export class RelationEmitter
{
  constructor(name, arity, logDebug)
  {
    this.name = name;
    this.arity = arity;

    this.logDebug = logDebug;
  }

  declaration()
  {
    return `
      
class Relation_${this.name}
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
      return newItem;
    }
    return item;
  }

  remove(${valueNames(this.arity)})
  {
    for (let i = 0; i < this.members.length; i++)
    {
      const item = this.members[i];
      if (${Arrays.range(this.arity).map(i => `v${i} === item.t${i}`).join(' && ')})
      {
        this.members.splice(i, 1);
        ${this.logDebug('`removed ${item} from members`')}
        return;
      }
    }    
  }

  removeDirect(item)
  {
    // can only 'directly' remove items that still exist!
    const index = this.members.indexOf(item);
    this.members.splice(index, 1);
  }

  select()
  {
    return this.members;
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

export class RelationEmitter0 // arity 0
{
  constructor(name, logDebug)
  {
    this.name = name;
    this.logDebug = logDebug;
  }

  declaration()
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
      return newItem;
    }
    return item;
  }

  remove()
  {
    const item = this.get();
    if (item === null)
    {
      return;
    }
    this.member = null;
    ${this.logDebug('`removed ${item} from members`')}
  }    

  removeDirect(item)
  {
    // in principle, this is only reached 'internally', so you cannot remove item that was not first selected
    // so: assert that this.member === item
    this.member = null;
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



export class FunctorEmitter
{
  constructor(name, arity, logDebug)
  {
    this.name = name;
    this.arity = arity;

    this.logDebug = logDebug;
  }

  declaration()
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
      return newItem;
    }
    return item;
  }

  remove(${valueNames(this.arity)})
  {
    for (let i = 0; i < this.members.length; i++)
    {
      const item = this.members[i];
      if (${Arrays.range(this.arity).map(i => `v${i} === item.t${i}`).join(' && ')})
      {
        this.members.splice(i, 1);
        ${this.logDebug('`removed ${item} from members`')}
        return;
      }
    }    
  }

  removeDirect(item)
  {
    // can only 'directly' remove items that still exist!
    const index = this.members.indexOf(item);
    this.members.splice(index, 1);
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
  constructor(name, logDebug)
  {
    this.name = name;
    this.logDebug = logDebug;
  }

  declaration()
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
      return newItem;
    }
    return item;
  }

  remove()
  {
    const item = this.get();
    if (item === null)
    {
      return;
    }
    this.member = null;
    ${this.logDebug('`removed ${item} from members`')}
  }    

  removeDirect(item)
  {
    // in principle, this is only reached 'internally', so you cannot remove item that was not first selected
    // so: assert that this.member === item
    this.member = null;
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

  declaration()
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
      return newItem;
    }
    return item;
  }

  remove(${valueNames(this.arity)})
  {
    for (let i = 0; i < this.members.length; i++)
    {
      const item = this.members[i];
      if (${Arrays.range(this.arity).map(i => `v${i} === item.t${i}`).join(' && ')})
      {
        this.members.splice(i, 1);
        ${this.logDebug('`removed ${item} from members`')}
        return;
      }
    }    
  }

  removeDirect(item)
  {
    // can only 'directly' remove items that still exist!
    const index = this.members.indexOf(item);
    this.members.splice(index, 1);
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
      return newItem;
    }
    return item;
  }

  remove()
  {
    const item = this.get();
    if (item === null)
    {
      return;
    }
    this.member = null;
    ${this.logDebug('`removed ${item} from members`')}
  }    

  removeDirect(item)
  {
    // in principle, this is only reached 'internally', so you cannot remove item that was not first selected
    // so: assert that this.member === item
    this.member = null;
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



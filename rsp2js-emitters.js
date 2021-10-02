import { Arrays, assertTrue } from 'common';

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
    sb.push(this.logDebug(`\`removed ${pred}(${tn.map(t => `\${${t}}`)}) from members\``));
    sb.push(`}`);
    return sb.join('\n');
  }

  remove(pred, fieldValues)
  {
    return `remove_${pred}(${fieldValues.join(', ')})`;
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
          return;
        }
      }
  `;
  }

  selectDecl_(pred, arity)
  {
    return `
      return ${pred}_members;
    `;
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
    ${maps[arity - 1]}.set(t${arity-1}, undefined);`);  
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

  objectDeclaration(pred, arity, tce)
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
  return ${tce.get(pred, termFields)};
};
${pred}.prototype._remove = function () {
  ${tce.remove(pred, termFields)};
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

export class FunctorConstructorEmitter extends TupleEmitter
{
  constructor(publicFunction)
  {
    super();
    this.publicFunction = publicFunction;
  }

  objectDeclaration(functor, arity, tce)
  {
    const tn = termNames(arity);
    const termAssignments = tn.map(t => `this.${t} = ${t};`);
    const termFields = tn.map(t => `this.${t}`);

    return `
    ${publicFunction(functor)}(${tn.join(', ')})
    {
      ${termAssignments.join('\n  ')}
      this._rc = 0;
      this._outproducts = new Set();
      this._outproductsgb = new Set();
      this._refs = [];
    }
    ${functor}.prototype.toString = function () {return atomString("${functor}", ${termFields.join(', ')})};
    ${functor}.prototype.values = function () {return [${termFields}]};
    ${functor}.prototype._remove = function () { ${tce.remove(functor, termFields)} };    
    `;
  }
}

export class ProductClassEmitter extends TupleEmitter
{
  constructor()
  {
    super();
  }

  objectDeclaration(name, arity, recursive) // TODO: remove recursive at some point
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







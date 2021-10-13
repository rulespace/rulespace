Rulespace: an incremental bottom-up rule engine
===============================================

Rulespace is a framework for specifying and instantiating incremental bottom-up rule engines.
It consists of the following main parts:
- Rulespace model and specification language for expressing facts and rules
- Compilation of rules and facts into an executable module (a JS constructor or ES module)
- Instantiation of Rulespace modules into a Rulespace instance that accepts fact deltas


Installation (developer)
------------------------

```
git clone https://github.com/rulespace/common.git
git clone https://github.com/rulespace/rulespace.git
cd common
npm link
cd ..
cd rulespace
npm link common
npm test
```

Overview
--------

### Specification of rules and facts
A Rulespace program--a set rules and facts--is expressed using the AST defined in `rsp.js`.

To facilitate the specification of rules and facts, and for testing and debugging purposes, this package also defines a surface syntax that is s-expression-based.
First, `str2sexp` turns Rulespace syntax into s-expressions, and then `sexp2rsp` transforms these s-expressions into a Rulespace AST.


### Compiling into executable JavaScript
A Rulespace AST can be compiled into a JavaScript constructor or module using function `rsp2js`. 
The resulting function or module exposes an interface that accepts fact deltas, i.e., the addition or removal of facts.


### Creating Rulespace instances
An instantiation of a Rulespace constructor, or the import of a Rulespace module, results in a fresh Rulespace instance that incrementally updates itself with every fact delta it receives.



Examples
--------

Check the `examples` directory.


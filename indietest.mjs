function link(t0, t1)
  {
    this._inproducts = new Set();
    this._outproducts = new Set();
    this._outproductsgb = new Set();
  }
  link.prototype.toString = function () {return atomString("link", this.t0, this.t1)};  


  link(1, 2);
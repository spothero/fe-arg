/* eslint-disable */
/*
  https://github.com/stretchr/arg.js

  JavaScript URL argument processing once and for all.

  by Mat Ryer and Ryan Quinn
  Copyright (c) 2013 Stretchr, Inc.

  Please consider promoting this project if you find it useful.

  Permission is hereby granted, free of charge, to any person obtaining a copy of this
  software and associated documentation files (the "Software"), to deal in the Software
  without restriction, including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
  to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies
  or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
  INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
  PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
  FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
  DEALINGS IN THE SOFTWARE.
*/
module.exports = {
  /**
     * Parses the arg string into an Arg.Arg object.
     */
    parse: function(s){
      if (!s) return {};
      if (s.indexOf("=")===-1 && s.indexOf("&")===-1) return {};
      s = this._cleanParamStr(s);
      var obj = {};
      var pairs = s.split("&");
      for (var pi in pairs) {
        if(pairs.hasOwnProperty(pi)){
          var kvsegs = pairs[pi].split("=");
          var key = decodeURIComponent(kvsegs[0]), val = this.__decode(kvsegs[1]);
          this._access(obj, key, val);
        }
      }
      return obj;
    },

    /**
     * Decodes a URL component (including resolving + to spaces)
     */
    __decode: function(s) {
      while (s && s.indexOf("+")>-1) {
        s = s.replace("+", " ");
      }
      s = decodeURIComponent(s);
      return s;
    },

    /**
     * Helper method to get/set deep nested values in an object based on a string selector
     *
     * @param  {Object}  obj        Based object to either get/set selector on
     * @param  {String}  selector   Object selector ie foo[0][1].bar[0].baz.foobar
     * @param  {Mixed}   value      (optional) Value to set leaf located at `selector` to.
     *                              If value is undefined, operates in 'get' mode to return value at obj->selector
     * @return {Mixed}
     */
    _access: function(obj, selector, value) {
      var shouldSet = typeof value !== "undefined";
      var selectorBreak = -1;
      var coerce_types = {
        'true'  : true,
        'false' : false,
        'null'  : null
      };

      // selector could be a number if we're at a numerical index leaf in which case selector.search is not valid
      if (typeof selector == 'string' || Object.prototype.toString.call(selector) == '[object String]') {
        selectorBreak = selector.search(/[\.\[]/);
      }

      // No dot or array notation so we're at a leaf, set value
      if (selectorBreak === -1) {
        if (this.coerceMode) {
          value = value && !isNaN(value)            ? +value              // number
                : value === 'undefined'             ? undefined           // undefined
                : coerce_types[value] !== undefined ? coerce_types[value] // true, false, null
                : value;                                    // string
        }
        return shouldSet ? (obj[selector] = value) : obj[selector];
      }

      // Example:
      // selector     = 'foo[0].bar.baz[2]'
      // currentRoot  = 'foo'
      // nextSelector = '0].bar.baz[2]' -> will be converted to '0.bar.baz[2]' in below switch statement
      var currentRoot = selector.substr(0, selectorBreak);
      var nextSelector = selector.substr(selectorBreak + 1);

      switch (selector.charAt(selectorBreak)) {
        case '[':
          // Intialize node as an array if we haven't visted it before
          obj[currentRoot] = obj[currentRoot] || [];
          nextSelector = nextSelector.replace(']', '');

          if (nextSelector.search(/[\.\[]/) === -1 && nextSelector.search(/^[0-9]+$/) > -1) {
            nextSelector = parseInt(nextSelector, 10);
          }

          return this._access(obj[currentRoot], nextSelector, value);
        case '.':
          // Intialize node as an object if we haven't visted it before
          obj[currentRoot] = obj[currentRoot] || {};
          return this._access(obj[currentRoot], nextSelector, value);
      }

      return obj;
    },

    /**
     * Turns the specified object into a URL parameter string.
     */
    stringify: function(obj, keyPrefix) {

      switch (typeof(obj)) {
      case "object":
        var segs = [];
        var thisKey;
        for (var key in obj) {

          if (!obj.hasOwnProperty(key)) continue;
          var val = obj[key];

          if (typeof(key) === "undefined" || key.length === 0 || typeof(val) === "undefined" || val === null || val.length === 0) continue;

          thisKey = keyPrefix ? keyPrefix+"."+key : key;

          if (typeof obj.length !== "undefined") {
            thisKey = keyPrefix ? keyPrefix+"["+key+"]" : key;
          }

          if (typeof val === "object") {
            segs.push(this.stringify(val, thisKey));
          } else {
            segs.push(encodeURIComponent(thisKey)+"="+encodeURIComponent(val));
          }

        }
        return segs.join("&");
      }

      return encodeURIComponent(obj);

    },

    /**
     * Generates a URL with the given parameters.
     * (object) = A URL to the current page with the specified parameters.
     * (path, object) = A URL to the specified path, with the object of parameters.
     * (path, object, object) = A URL to the specified path with the first object as query parameters,
     * and the second object as hash parameters.
     */
    url: function(){

      var sep = (this.urlUseHash ? this.hashQuerySeperator : this.querySeperator);
      var segs = [location.pathname, sep];
      var args = {};

      switch (arguments.length) {
      case 1: // this.url(params)
        segs.push(this.stringify(arguments[0]));
        break;
      case 2: // this.url(path, params)
        segs[0] = this._cleanPath(arguments[0]);
        args = this.parse(arguments[0]);
        args = this.merge(args, arguments[1]);
        segs.push(this.stringify(args));
        break;
      case 3: // this.url(path, query, hash)
        segs[0] = this._cleanPath(arguments[0]);
        segs[1] = this.querySeperator;
        segs.push(this.stringify(arguments[1]));
        (typeof(arguments[2])==="string") ? segs.push(this.hashSeperator) : segs.push(this.hashQuerySeperator);
        segs.push(this.stringify(arguments[2]));
      }

      var s = segs.join("");

      // trim off sep if it's the last thing
      if (s.indexOf(sep) == s.length - sep.length) {
        s = s.substr(0, s.length - sep.length);
      }

      return s;

    },

    /** urlUseHash tells the this.url method to always put the parameters in the hash. */
    urlUseHash: false,

    /** The string that seperates the path and query parameters. */
    querySeperator: "?",

    /** The string that seperates the path or query, and the hash property. */
    hashSeperator: "#",

    /** The string that seperates the the path or query, and the hash query parameters. */
    hashQuerySeperator: "#?",

    /** When parsing values if they should be coerced into primitive types, ie Number, Boolean, Undefined */
    coerceMode: true,

    /**
     * Gets all parameters from the current URL.
     */
    all: function(){
      var merged = this.parse(this.querystring() + "&" + this.hashstring());
      return this._all ? this._all : this._all = merged;
    },

    /**
     * Gets a parameter from the URL.
     */
    get: function(selector, def){
      var val = this._access(this.all(), selector);
      return typeof(val) === "undefined" ? def : val;
    },

    /**
     * Gets the query string parameters from the current URL.
     */
    query: function(){
      return this._query ? this._query : this._query = this.parse(this.querystring());
    },

    /**
     * Gets the hash string parameters from the current URL.
     */
    hash: function(){
      return this._hash ? this._hash : this._hash = this.parse(this.hashstring());
    },

    /**
     * Gets the query string from the URL (the part after the ?).
     */
    querystring: function(){
      return this._cleanParamStr(location.search);
    },

    /**
     * Gets the hash param string from the URL (the part after the #).
     */
    hashstring: function(){
      var rawHref = location.href;
      var hashIndex = rawHref.indexOf("#");
      var hash = hashIndex >= 0 ? rawHref.substr(hashIndex) : "";
      return this._cleanParamStr(hash);
    },

    /*
     * Cleans the URL parameter string stripping # and ? from the beginning.
     */
    _cleanParamStr: function(s){

      if (s.indexOf(this.querySeperator)>-1)
        s = s.split(this.querySeperator)[1];

      if (s.indexOf(this.hashSeperator)>-1)
        s = s.split(this.hashSeperator)[1];

      if (s.indexOf("=")===-1 && s.indexOf("&")===-1)
        return "";

      while (s.indexOf(this.hashSeperator) === 0 || s.indexOf(this.querySeperator) === 0)
        s = s.substr(1);

      return s;
    },

    _cleanPath: function(p){

      if (p.indexOf(this.querySeperator)>-1)
        p = p.substr(0,p.indexOf(this.querySeperator));

      if (p.indexOf(this.hashSeperator)>-1)
        p = p.substr(0,p.indexOf(this.hashSeperator));

      return p;
    },

    /**
     * Merges all the arguments into a new object.
     */
    merge: function(){
      var all = {};
      for (var ai in arguments){
        if(arguments.hasOwnProperty(ai)){
          for (var k in arguments[ai]){
            if(arguments[ai].hasOwnProperty(k)){
              all[k] = arguments[ai][k];
            }
          }
        }
      }
      return all;
    }
};


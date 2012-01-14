function mol() {
    var args = Array.prototype.slice.call(arguments),
        callback = args.pop(),
        submodules = (args[0] && typeof args[0] === "string") ? args : args[0],
        modules = null,
        i,
        m,
        mod,
        submod;

    if (!(this instanceof mol)) {
        return new mol(submodules, callback);
    }
   
    if (!modules || modules === '*') {
        modules = [];
        for (i in mol.modules) {
            if (mol.modules.hasOwnProperty(i)) {
                modules.push(i);
            }
        }
    }
    
    // Support for submodules like map.controls. Requires calling
    // mol() with submodules: mol('map.controls', function(env){})
    // TODO: Design better API for this.
    if (submodules) {
        for (i in submodules) {
            modules.push(submodules[i]);
        }
    }

    for (i = 0; i < modules.length; i += 1) {
        m = modules[i];
        if (m.indexOf('.') != -1) {
            mod = m.split('.')[0];
            submod = m.split('.')[1];
            mol.modules[mod][submod](this);
        } else {
            mol.modules[modules[i]](this);            
        }
    }
    callback(this);
    return this;
};

mol.modules = {};

mol.modules.common = function(mol) {

    mol.common = {};
    
    mol.common.assert = function(pred, msg) {
        if (!pred) {
            throw("Assertion failed: {0}".format(msg));
        }
    };
};

/**
 * https://gist.github.com/1049426
 * 
 * Usage: 
 * 
 *   "{0} is a {1}".format("Tim", "programmer");
 * 
 */
String.prototype.format = function(i, safe, arg) {
  function format() {
      var str = this, 
          len = arguments.length+1;
      
      for (i=0; i < len; arg = arguments[i++]) {
          safe = typeof arg === 'object' ? JSON.stringify(arg) : arg;
          str = str.replace(RegExp('\\{'+(i-1)+'\\}', 'g'), safe);
      }
      return str;
  }
  format.native = String.prototype.format;
  return format;
}();

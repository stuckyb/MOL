mol.modules.services.cartodb = function(mol) {
  
  mol.services.cartodb = {};
  
  mol.services.cartodb.SqlApi = Class.extend(
    {
      init: function(user, host) {
        this.user = user;
        this.host = host;
        this.url = 'https://{0}.{1}/api/v1/sql?q={2}';        
      },

      query: function(sql, callback) {
        var encodedSql = encodeURI(sql),
        request = this.url.format(this.user, this.host, encodedSql);
        xhr = $.getJSON(request); 
        
        xhr.success(
          function(response) {
            callback.success(response);
          }
        );

        xhr.error(
          function(response) {
            callback.failure(response);
          }
        );
      }
    }
  );
  
  // TODO: Put params in mol.config.js
  //mol.services.cartodb.sqlApi = new
  //mol.services.cartodb.SqlApi('layers', 'moldb.io:8080');
  mol.services.cartodb.sqlApi = new mol.services.cartodb.SqlApi('mol', 'cartodb.com');
  
  mol.services.cartodb.query = function(sql, callback) {
    mol.services.cartodb.sqlApi.query(sql, callback);
  };

  /**
   * Converts a CartoDB SQL response to a search profile response.
   * 
   */
  mol.services.cartodb.Converter = Class.extend(    
    {
      init: function() {
      },
      
      convert: function(response) {
        this.response = response;
        return {

          "layers": this.getLayers(this.response), 
          "names": this.genNames(this.response), 
          "sources": this.genSources(this.response), 
          "types": this.genTypes(this.response)
        };
      },

      /**
       * Returns an array of unique values in the response. Key value is 
       * name, source, or type.
       */
      uniques: function(key, response) {
        var results = [],
        row = null;

        for (i in response.rows) {
          row = response.rows[i];
          switch (key) {
          case 'name':
            results.push(row.name);
            break;
          case 'type':
            results.push(row.type);
            break;
          case 'source':
            results.push(row.source);
            break;
          }
        }
        return _.uniq(results);
      },

      /**
       * Returns the top level names profile object.
       *  
       * {"name": "types":[], "sources":[], "layers":[]}
       * 
       */
      genNames: function(response) {
        var names = this.uniques('name', response),
        name = null,
        profile = {};
        
        for (i in names) {
          name = names[i];
          profile[name] = this.getNameProfile(name, response);
        }
        
        return profile;
      },
      
      /**
       * Returns the top level types profile object.
       *  
       * {"type": "names":[], "sources":[], "layers":[]}
       * 
       */
      genTypes: function(response) {
        var types = this.uniques('type', response),
        type = null,
        profile = {};
        
        for (i in types) {
          type = types[i];
          profile[type] = this.getTypeProfile(type, response);
        }
        
        return profile;
      },

      /**
       * Returns the top level source profile object.
       *  
       * {"source": "names":[], "types":[], "layers":[]}
       * 
       */
      genSources: function(response) {
        var sources = this.uniques('source', response),
        source = null,
        profile = {};
        
        for (i in sources) {
          source = sources[i];
          profile[source] = this.getSourceProfile(source, response);
        }
        
        return profile;
      },

      /**
       * Returns a profile for a single name.
       */
      getNameProfile: function(name, response) {
        var layers = [],
        sources = [],
        types = [],
        row = null;
        
        for (i in response.rows) {
          row = response.rows[i];
          if (name === row.name) {
            layers.push(i + '');
            sources.push(row.source);
            types.push(row.type);
          }
        }
        return {
          "layers": _.uniq(layers),
          "sources" : _.uniq(sources),
          "types": _.uniq(types)
        };
      },

      /**
       * Returns a profile for a single source.
       */
      getSourceProfile: function(source, response) {
        var layers = [],
        names = [],
        types = [],
        row = null;
        
        for (i in response.rows) {
          row = response.rows[i];
          if (source === row.source) {
            layers.push(i + '');
            names.push(row.name);
            types.push(row.type);
          }
        }
        return {
          "layers": _.uniq(layers),
          "names" : _.uniq(names),
          "types": _.uniq(types)
        };
      },

      /**
       * Returns a profile for a single type.
       */
      getTypeProfile: function(type, response) {
        var layers = [],
        sources = [],
        names = [],
        row = null;
        
        for (i in response.rows) {
          row = response.rows[i];
          if (type === row.type) {
            layers.push(i + '');
            sources.push(row.source);
            names.push(row.name);
          }
        }
        return {
          "layers": _.uniq(layers),
          "sources" : _.uniq(sources),
          "names": _.uniq(names)
        };
      },
      
      /**
       * Returns the layers profile.
       */
      getLayers: function(response) {
        var rows = response.rows,
        row = null,
        key = null,
        layers = {};

        for (i in rows) {
          row = rows[i];
          key = i + '';
          layers[key] = {
            name: row.name,
            source: row.source,
            type: row.type
            //extent: this.getExtent(row.extent)
          };
        }
        return layers;
      },

      /**
       * Returns an array of coordinate arrays:
       * [[1, 2], ...]
       *  
       * @param polygon POLYGON((34.073597 36.393648,34.073597 36.467531,
       *                         34.140662 36.467531,34.140662 36.393648,
       *                         34.073597 36.393648))
       */
      getExtent: function(polygon) {
        return _.map(
          polygon.split('POLYGON((')[1].split('))')[0].split(','), 
          function(x) {
            var pair = x.split(' '); 
            return [parseFloat(pair[0]), parseFloat(pair[1])];
          }
        );                
      }
    }
  );

  mol.services.cartodb.converter = new mol.services.cartodb.Converter();

  mol.services.cartodb.convert = function(response) {
    return mol.services.cartodb.converter.convert(response);
  };
};

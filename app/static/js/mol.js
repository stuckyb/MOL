function mol() {
    var args = Array.prototype.slice.call(arguments),
        callback = args.pop(),
        modules = (args[0] && typeof args[0] === "string") ? args : args[0],        
        i,
        m,
        mod,
        submod;

    if (!(this instanceof mol)) {
        return new mol(modules, callback);
    }
   
    if (!modules || modules === '*') {
        modules = [];
        for (i in mol.modules) {
            if (mol.modules.hasOwnProperty(i)) {
                modules.push(i);
            }
        }
    }

    for (i = 0; i < modules.length; i += 1) {
        m = modules[i];
        mol.modules[m](this);            
        if (this[m].hasOwnProperty('submodules')) {
             for (submod in this[m].submodules) {
                 mol.modules[m][this[m]['submodules'][submod]](this);
             }
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
/**
 * This module provides core functions. 
 */
mol.modules.core = function(mol) { 
    
    mol.core = {};

    /**
     * Retunrs a layer id string given a layer {name, type, source}.
     */
    mol.core.getLayerId = function(layer) {
        var name = layer.name.trim().replace(/ /g, "_"),
            type = layer.type.trim().replace(/ /g, "_"),
            source = layer.source.trim().replace(/ /g, "_");
        
        return 'layer-{0}-{1}-{2}'.format(name, type, source);
    };
    
    /**
     * @param id The layer id of the form "layer-{name}-{type}-{source}".
     */
    mol.core.getLayerFromId = function(id) {
        var tokens = id.split('-'),
            name = tokens[1].replace(/_/g, " "),
            type = tokens[2].replace(/_/g, " "),
            source = tokens[3].replace(/_/g, " ");
        
        return {
            id: id,
            name: name,
            type: type,
            souce: source
        };
    };
};
mol.modules.bus = function(mol) {

    mol.bus = {};
    
    mol.bus.Event = Class.extend(
        {
            init: function(type, params) {
                mol.common.assert(type);
                this.type = type;
                if (params) {
                    _.extend(this, params);   
                }
            }
        }
    );

    mol.bus.Bus = function() {

        if (!(this instanceof mol.bus.Bus)) {
            return new mol.bus.Bus();
        }
        _.extend(this, Backbone.Events);

        this.fireEvent = function(event) {
            this.trigger(event.type, event);
        };

        this.addHandler = function(type, handler) {
            this.bind(
                type, 
                function(event) {
                    handler(event);
                }
            );
        };
        return this;
    };
};
mol.modules.mvp = function(mol) {
    
    mol.mvp = {};

    mol.mvp.Model = Class.extend(
        {           
            init: function(props) {
                this.props = props;
            },

            get: function(name) {
                return this.props[name];
            },

            json: function() {
                return JSON.stringify(this.props);
            }
        }
    );
    
    mol.mvp.Engine = Class.extend(
        {
            start: function(container) {
            },
            
            go: function(place) {
            },
            
            state: function() {
            }
        }
    );

    mol.mvp.View = Class.extend(
        {
            init: function(element, parent) {
                if (!element) {
                    element = '<div>';
                }
                _.extend(this, $(element));
                this.element = this[0];
                if (parent) {
                    $(parent).append(this.element);
                }
            }
        }
    );

    mol.mvp.Display = mol.mvp.View.extend(
        {
            init: function(element, parent) {
                this._super(element, parent);
            },

            engine: function(engine) {
                this.engine = engine;
            }
        }
    );
};mol.modules.services = function(mol) {
  
    mol.services = {};

    mol.services.submodules = ['cartodb'];

    mol.services.Action = Class.extend(
        {
            init: function(type, params) {
                mol.common.assert(type);
                this.type = type;
                if (params) {
                    _.extend(this, params);   
                }
            }
        }
    );

    mol.services.Callback = Class.extend(
        {
            /**
             * The success callback function takes as parameters the result
             * object and the action.
             * 
             * The failure callback function takes as parameters the error
             * result object and the action.
             *
             * @param success a callback function handling success
             * @param failure a callback function handling failure
             */
            init: function(success, failure) {
                this.success = success;
                this.failure = failure;
            }
        }
    );

    mol.services.Proxy = Class.extend(
        {
            /**
             * @param bus mol.bus.Bus
             */
            init: function(bus) {
                this.bus = bus;
            },
            
            /**
             * The callback here takes the action and the response as parameters.
             * 
             * @param action the mol.services.Action
             * @param callback the mol.services.Callback
             */
            execute: function(action, callback) {
                var cartodb = mol.services.cartodb;

                switch (action.type) {
                    case 'cartodb-sql-query':
                    cartodb.query(action.sql, this.callback(action, callback));
                    break;
                }
            },

            /**
             * Returns a proxy callback clousure around the clients action and 
             * the clients callback. This gets executed by the service. The 
             * services are expected to pass the service response to the callback 
             * as a single parameter.
             * 
             * @param action the client mol.services.Action
             * @param callback the client mol.services.Callback
             */
            callback: function(action, callback) {
                var self = this;

                return new mol.services.Callback(
                    function(response) { // Success.
                        callback.success(action, response);
                        self.fireEvents(action, response);
                    },
                    function (response) { // Failure.
                        callback.failure(action, response);
                        self.fireEvents(action, response, true);
                    }
                );
            },

            fireEvents: function(action, response, error) {
                var params = {
                        action: action, 
                        response:response, 
                        error:  error ? true : false
                    },
                    event = new mol.bus.Event(action.type, params);
                                  
                this.bus.fireEvent(event);
            }                
        }
    );
};mol.modules.services.cartodb = function(mol) {
  
  mol.services.cartodb = {};
  
  mol.services.cartodb.SqlApi = Class.extend(
    {
      init: function(user, host) {
        this.user = user;
        this.host = host;
        this.url = 'https://{0}.{1}/api/v2/sql?q={2}';        
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
mol.modules.map = function(mol) {

    mol.map = {};

    mol.map.submodules = ['search', 'results', 'layers', 'tiles', 'menu'];

    mol.map.MapEngine = mol.mvp.Engine.extend(
        {
            init: function(api, bus) {
                this.api = api;
                this.bus = bus;
            },

            start: function(container) {
                this.display = new mol.map.MapDisplay('.map_container');
                this.addControls();
                this.addEventHandlers();
            },

            go: function(place) {
            },

            place: function() {
            },

            addControls: function() {
                var map = this.display.map,
                    controls = map.controls,
                    c = null,
                    ControlPosition = google.maps.ControlPosition,
                    ControlDisplay = mol.map.ControlDisplay;

                // Add top right map control.
                this.ctlRight = new ControlDisplay('RightControl');
                controls[ControlPosition.TOP_RIGHT].clear();
                controls[ControlPosition.TOP_RIGHT].push(this.ctlRight.element);

                // Add top center map control.
                this.ctlTop = new ControlDisplay('CenterTopControl');
                controls[ControlPosition.TOP_CENTER].clear();
                controls[ControlPosition.TOP_CENTER].push(this.ctlTop.element);

                // Add top left map control.
                this.ctlLeft = new ControlDisplay('TopLeftControl');
                controls[ControlPosition.TOP_LEFT].clear();
                controls[ControlPosition.TOP_LEFT].push(this.ctlLeft.element);

                // Add bottom left map control.
                this.ctlBottom = new ControlDisplay('LeftBottomControl');
                controls[ControlPosition.BOTTOM_LEFT].clear();
                controls[ControlPosition.BOTTOM_LEFT].push(this.ctlBottom.element);
            },

            /**
             * Gets the control display at a Google Map control position.
             *
             * @param position google.maps.ControlPosition
             * @return mol.map.ControlDisplay
             */
            getControl: function(position) {
                var ControlPosition = google.maps.ControlPosition,
                    control = null;

                switch (position) {
                case ControlPosition.TOP_RIGHT:
                    control = this.ctlRight;
                    break;
                case ControlPosition.TOP_CENTER:
                    control = this.ctlTop;
                    break;
                case ControlPosition.TOP_LEFT:
                    control = this.ctlLeft;
                    break;
                case ControlPosition.BOTTOM_LEFT:
                    control = this.ctlBottom;
                    break;
                }

                return control;
            },

            addEventHandlers: function() {
                var self = this;

                /**
                 * The event.overlays contains an array of overlays for the map.
                 */
                this.bus.addHandler(
                    'add-map-overlays',
                    function(event) {
                        _.each(
                            event.overlays,
                            function(overlay) {
                                this.display.map.overlayMapTypes.push(overlay);
                            },
                            self
                        );
                    }
                );


                /**
                 * Handles the layer-toggle event. The event.layer is a layer
                 * object {name, type} and event.showing is true if the layer
                 * is showing, false otherwise.
                 */
                this.bus.addHandler(
                    'layer-toggle',
                    function(event) {
                        var name = event.layer.name,
                            type = event.layer.type,
                            id = 'layer-{0}-{1}'.format(name, type),
                            overlayMapTypes = self.display.map.overlayMapTypes;

                        overlayMapTypes.forEach(
                            function(layer, index) {
                                if (layer.name === id) {
                                    overlayMapTypes.removeAt(index);
                                }
                            }
                        );
                    }
                );

                this.bus.addHandler(
                    'add-map-control',

                    /**
                     * Callback that adds a map control display in a specified
                     * slot. The event is expected to have the following
                     * properties:
                     *
                     *   event.display - mol.map.ControlDisplay
                     *   event.slot - mol.map.ControlDisplay.Slot
                     *   event.position - google.maps.ControlPosition
                     *
                     * @param event mol.bus.Event
                     */
                    function(event) {
                        var display = event.display,
                            slot = event.slot,
                            position = event.position,
                            control = self.getControl(position);

                        control.slot(display, slot);
                    }
                );
            }
        }
    );

    mol.map.MapDisplay = mol.mvp.View.extend(
        {
            init: function(element) {
                var mapOptions = null;

                this._super(element);

                mapOptions = {
                    zoom: 2,
                    maxZoom: 15,
                    minZoom: 2,
                    minLat: -85,
                    maxLat: 85,
                    mapTypeControlOptions: { position: google.maps.ControlPosition.BOTTOM_LEFT},
                    center: new google.maps.LatLng(0,0),
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                    styles: [
                        {
                            "featureType":"all",
                            "elementType":"all",
                            "stylers":[
                                {
                                    "lightness":43
                                },
                                {
                                    "visibility":"simplified"
                                },
                                {
                                    "saturation":-59
                                }
                            ]
                        },
                        {
                            "elementType":"labels",
                            "stylers":[
                                {
                                    "visibility":"on"
                                }
                            ]
                        }

                    ]
                };

                //create the loading widget
                this.map = new google.maps.Map(this.element, mapOptions);
                // this.map.loading = document.createElement("IMG");
                // this.map.loading.className = "mol-LoadingWidget";
                // this.map.loading.src = "static/loading.gif";
                // document.body.appendChild(this.map.loading);

                // google.maps.event.addListener(
                //         this.map,
                //         'zoom_changed',
                //         this.mapZoomChanged.bind(this)
                // );
                // google.maps.event.addListener(
                //         this.map,
                //         'idle',
                //         this.mapIdle.bind(this)
                // );
            },
            
            /*
             *  Map event handler to show layer loading gifs when the zoom level changes.
             */
            mapZoomChanged: function() {
                $(this.map.loading).show();
            },
            
            /*
             * Map event handler to hide loading gifs after the map is finished loading.
             * Sets a callback on the overlays if they exist.
             */
            mapIdle: function() {
                if (this.map.overlayMapTypes.length>0) {
                    $("img", this.map.overlayMapTypes).imagesLoaded(this.overlaysLoaded.bind(this));
                } else {
                    $(this.map.loading).hide();
                }
            },
            
            /*
             * Event handler to turn off loading gif when map overlays have finished loading.
             * @param images an array of img elements within the overlayMapType
             * @param proper an array of img elemets that successfully loaded
             * @param broken and array of img elements that are broken
             */
            overlaysLoaded: function(images, proper, broken) {
                $(this.map.loading).hide();
            }
        }
    );

    /**
     * This display is a container with support for adding composite displays in
     * a top, middle, and bottom slot. It gets attached to a map control positions.
     *
     */
    mol.map.ControlDisplay = mol.mvp.View.extend(
        {
            /**
             * @param name css class name for the display
             */
            init: function(name) {
                var Slot = mol.map.ControlDisplay.Slot,
                    className = 'mol-Map-' + name,
                    html = '' +
                    '<div class="' + className + '">' +
                    '    <div class="TOP"></div>' +
                    '    <div class="MIDDLE"></div>' +
                    '    <div class="BOTTOM"></div>' +
                    '</div>';

                this._super(html);
                this.find(Slot.TOP).removeClass('ui-selectee');
                this.find(Slot.MIDDLE).removeClass('ui-selectee');
                this.find(Slot.BOTTOM).removeClass('ui-selectee');
            },

            /**
             * Puts a display in a slot.
             *
             * @param dislay mol.map.ControlDisplay
             * @param slot mol.map.ControlDisplay.Slot
             */
            slot: function(display, slot) {
                var Slot = mol.map.ControlDisplay.Slot,
                    slotDisplay = this.find(slot);

                switch (slot) {
                case Slot.FIRST :
                    this.prepend(display);
                    break;
                case Slot.LAST:
                    this.append(display);
                    break;
                default:
                    slotDisplay.append(display);
                }
            }
        }
    );

    mol.map.ControlDisplay.Slot = {
        FIRST: '.FIRST',
        TOP: '.TOP',
        MIDDLE: '.MIDDLE',
        BOTTOM: '.BOTTOM',
        LAST: '.LAST'
    };
};
mol.modules.map.layers = function(mol) {

    mol.map.layers = {};

    mol.map.layers.LayerEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
            },

            start: function() {
                this.display = new mol.map.layers.LayerListDisplay('.map_container');
                this.fireEvents();
                this.addEventHandlers();
            },

            /**
             * Handles an 'add-layers' event by adding them to the layer list.
             * The event is expected to have a property named 'layers' which
             * is an arry of layer objects, each with a 'name' and 'type' property. 
             * This function ignores layers that are already represented
             * as widgets.
             */
            addEventHandlers: function() {
                var self = this;

                this.bus.addHandler(
                    'add-layers',
                    function(event) {
                        _.each(
                            event.layers,
                            function(layer) { // Removes duplicate layers.
                                if (self.display.getLayer(layer).length > 0) {
                                    event.layers = _.without(event.layers, layer);
                                }
                            }
                        );
                        self.addLayers(event.layers);
                    }
                );
            },

            /**
             * Fires the 'add-map-control' event. The mol.map.MapEngine handles
             * this event and adds the display to the map.
             */
            fireEvents: function() {
                var params = {
                        display: this.display,
                        slot: mol.map.ControlDisplay.Slot.TOP,
                        position: google.maps.ControlPosition.TOP_RIGHT
                    },
                    event = new mol.bus.Event('add-map-control', params);

                this.bus.fireEvent(event);
            },
            
            /**
             * Adds layer widgets to the map. The layers parameter is an array
             * of layer objects {id, name, type, source}.
             */
            addLayers: function(layers) {
                _.each(
                    layers,
                    function(layer) {
                        var l = this.display.addLayer(layer);
                        self = this;
               
                        // Opacity slider change handler.
                        l.opacity.change(
                            function(event) {
                                var params = {
                                        layer: layer,
                                        opacity: parseFloat(l.opacity.val())
                                    },
                                    e = new mol.bus.Event('layer-opacity', params);
                                
                                self.bus.fireEvent(e);                                
                            }
                        );
                        
                        // Click handler for zoom button.
                        l.zoom.click(
                            function(event) {
                                var params = {
                                        layer: layer,
                                        auto_bound: true
                                    },
                                    e = new mol.bus.Event('layer-zoom-extent', params);
                                
                                self.bus.fireEvent(e);
                            }
                        );
                        
                        l.toggle.attr('checked', true);
                        
                        // Click handler for the toggle button.
                        l.toggle.click(
                            function(event) {
                                var showing = $(event.currentTarget).is(':checked'),
                                    params = {
                                        layer: layer,
                                        showing: showing
                                    },
                                    e = new mol.bus.Event('layer-toggle', params);

                                self.bus.fireEvent(e);
                            }
                        );
                    },
                    this
                );
            }
        }
    );

    mol.map.layers.LayerDisplay = mol.mvp.View.extend(
        {
            init: function(layer) {
                var html = '' +
                    '<div class="layerContainer">' +
                    '  <div class="layer widgetTheme">' +
                    '    <button><img class="type" src="/static/maps/search/{0}.png"></button>' +
                    '    <div class="layerName">' +
                    '        <div class="layerNomial">{1}</div>' +
                    '    </div>' +
                    '    <div class="buttonContainer">' +
                    '        <input class="toggle" type="checkbox">' +
                    '        <span class="customCheck"></span> ' +
                    '    </div>' +                    
                    '    <button class="info">i</button>' +
                    '    <button class="zoom">z</button>' +
                    '    <input type="range" class="opacity" min=".25" max="1.0" step=".25" />' +
                    '  </div>' +
                    '</div>';

                this._super(html.format(layer.type, layer.name));
                this.attr('id', layer.id);
                this.opacity = $(this.find('.opacity'));
                this.toggle = $(this.find('.toggle'));
                this.zoom = $(this.find('.zoom'));
                this.info = $(this.find('.info'));
            }
        }
    );

    mol.map.layers.LayerListDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-LayerControl-Layers">' +
                    '  <div class="staticLink widgetTheme" style="display: none; ">' +
                    '    <input type="text" class="linkText">' +
                    '  </div>' +
                    '  <div class="scrollContainer" style="">' +
                    '    <ul id="sortable">' +
                    '    </ul>' +
                    '  </div>' +
                    '</div>';

                this._super(html);
                $(this.find("#sortable")).sortable();
		          $(this.find("#sortable")).disableSelection();
                this.open = false;
                this.views = {};
                this.layers = [];
                this.render();
            },

            getLayer: function(layer) {
                return $(this.find('#{0}'.format(layer.id)));
            },

            addLayer: function(layer) {
                var ld = new mol.map.layers.LayerDisplay(layer);

                $(this.find('#sortable')).append(ld);
                return ld;
            },

            render: function(howmany, order) {
                var self = this,
                    el = $(this.find('.dropdown'));

                el.find('li').each(
                    function(i ,el) {
                        $(el).remove();
                    }
                );

                _(this.layers.slice(0, howmany)).each(
                    function(layer) {
                        var v = self.views[layer.name];

                        if (v) {
                            delete self.views[layer.name];
                        }

                        v = new Layer(
                            {
                                layer: layer,
                                bus: self.bus
                            }
                        );

                        self.views[layer.name] = v;
                        el.find('a.expand').before(v.render().el);
                        //el.append(v.render().el);
                    }
                );

                if (howmany === self.layers.length) {
                    $(this.find('a.expand')).hide();
                } else {
                    $(this.find('a.expand')).show();
                }

                el.sortable(
                    {
                        revert: false,
                        items: '.sortable',
                        axis: 'y',
                        cursor: 'pointer',
                        stop: function(event,ui) {
                            $(ui.item).removeClass('moving');
                            //DONT CALL THIS FUNCTION ON beforeStop event, it will crash
                            self.sortLayers();
                        },
                        start:function(event,ui) {
                            $(ui.item).addClass('moving');
                        }
                    }
                );

                this.updateLayerNumber();
                return this;
            },

            updateLayerNumber: function() {
                var t = 0;
                _(this.layers).each(function(a) {
                                        if(a.enabled) t++;
                                    });
                $(this.find('.layer_number')).html(t + " LAYER"+ (t>1?'S':''));
            },

            sortLayers: function() {
                var order = [];
                $(this.find('li')).each(function(i, el) {
                                      order.push($(el).attr('id'));
                                  });
                this.bus.emit("map:reorder_layers", order);
            },

            open: function(e) {
                if(e) e.preventDefault();
                this.el.addClass('open');
                this.el.css("z-index","100");
                this.open = true;
            },

            close: function(e) {
                this.el.removeClass('open');
                this.el.css("z-index","10");
                this.open = false;
            },

            sort_by: function(layers_order) {
                this.layers.sort(function(a, b) {
                                     return _(layers_order).indexOf(a.name) -
                                         _(layers_order).indexOf(b.name);
                                 });
                this.open = true;
                this.hiding();
            },

            hiding: function(e) {
                var layers = null;
                
                if (!this.open) {
                    return;
                }
                
                // put first what are showing
                this.layers.sort(
                    function(a, b) {
                        if (a.enabled && !b.enabled) {
                            return -1;
                        } else if (!a.enabled && b.enabled) {
                            return 1;
                        }
                        return 0;
                    }
                );
                layers = _(this.layers).pluck('name');
                this.bus.emit("map:reorder_layers", layers);
                this.order = layers;
                this.render(3);
                this.close();
            }
        }
    );
};
mol.modules.map.menu = function(mol) {
    
    mol.map.menu = {};
    
    mol.map.menu.MenuEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
            },
            
            /**
             * Starts the MenuEngine. Note that the container parameter is 
             * ignored.
             */
            start: function() {
                this.display = new mol.map.menu.MenuDisplay();
                this.display.toggle(true);
                this.addEventHandlers();
                this.fireEvents();
            },

            /**
             * Adds a handler for the 'search-display-toggle' event which 
             * controls display visibility. Also adds UI event handlers for the
             * display.
             */
            addEventHandlers: function() {
                var self = this;
                
                this.display.searchItem.click(
                    function(event) {                        
                        self.bus.fireEvent(
                            new mol.bus.Event('search-display-toggle'));
                    }
                );
            },
            
            /**
             * Fires the 'add-map-control' event. The mol.map.MapEngine handles 
             * this event and adds the display to the map.
             */
            fireEvents: function() {
                var params = {
                        display: this.display,    
                        slot: mol.map.ControlDisplay.Slot.FIRST,
                        position: google.maps.ControlPosition.TOP_RIGHT
                    },
                    event = new mol.bus.Event('add-map-control', params);

                this.bus.fireEvent(event);
            }            
        }
    );
    
    mol.map.menu.MenuDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-LayerControl-Menu ">' +
                    '    <div class="label">' +
                    '       <img class="layersToggle" src="/static/maps/layers/expand.png">' +
                    '    </div>' +
                    '    <div class="widgetTheme search button">Search</div>' +  
                    
                    // TODO: These are commented out while we decide where this functionality goes.
                    // '    <div class="widgetTheme share button">Share</div>' +
                    // '    <div class="widgetTheme zoom button">Zoom</div>' +
                    // '    <div class="widgetTheme delete button">Delete</div>' +
                    // '    <div class="widgetTheme search button">Search</div>' +
                    // '    <div class="widgetTheme add button">Add</div>' +

                    '</div>' +
                    '<div class="mol-LayerControl-Layers">' +
                    '      <div class="staticLink widgetTheme" >' +
                    '          <input type="text" class="linkText" />' +
                    '      </div>' +
                    '   <div class="scrollContainer">' +
                    '   </div>' +
                    '</div>';

                this._super(html);
                this.searchItem = $(this.find('.search'));
            }
        }
    );    
};
    
        
            
/**
 * This module provides support for rendering search results.
 */
mol.modules.map.results = function(mol) {

    mol.map.results = {};

    mol.map.results.ResultsEngine = mol.mvp.Engine.extend(
        {
            /**
             * @param bus mol.bus.Bus
             */
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
            },

            /**
             * Starts the SearchEngine. Note that the container parameter is
             * ignored.
             */
            start: function(container) {
                this.display = new mol.map.results.ResultsDisplay();
                this.display.toggle(false);
                this.addEventHandlers();
                this.fireEvents();
            },

            /**
             * Adds a handler for the 'search-display-toggle' event which
             * controls display visibility. Also adds UI event handlers for the
             * display.
             */
            addEventHandlers: function() {
                var self = this;

                /**
                 * Clicking the "select all" link checks all results.
                 */
                this.display.selectAllLink.click(
                    function(event) {
                        self.display.toggleSelections(true);
                    }
                );

                /**
                 * Clicking the 'map selected layers' button fires an 'add-layers'
                 * event on the bus.
                 */
                this.display.addAllButton.click(
                    function(event) {
                        var checkedResults = self.display.getChecked(),
                        layers = _.map(
                            checkedResults,
                            function(result) {
                                var id = result.find('.result').attr('id');
                                return mol.core.getLayerFromId(id);
                            }
                        );

                        self.bus.fireEvent(
                            new mol.bus.Event(
                                'add-layers',
                                {
                                    layers: layers
                                }
                            )
                        );
                    }
                );
                /**
                 * Clicking the "select none" link unchecks all results.
                 */
                this.display.selectNoneLink.click(
                    function(event) {
                        self.display.toggleSelections(false);
                    }
                );

                /**
                 * Callback that toggles the search display visibility. The
                 * event is expected to have the following properties:
                 *
                 *   event.visible - true to show the display, false to hide it,
                 *                   undefined to toggle.
                 *
                 * @param event mol.bus.Event
                 */
                this.bus.addHandler(
                    'results-display-toggle',
                    function(event) {
                        if (event.visible === undefined) {
                            self.display.toggle();
                        } else {
                            self.display.toggle(event.visible);
                        }
                    }
                );

                /**
                 * Callback that displays search results.
                 */
                this.bus.addHandler(
                    'search-results',
                    function(event) {
                        self.results = mol.services.cartodb.convert(event.response);
                        self.profile = new mol.map.results.SearchProfile(self.results);
                        if (self.getLayersWithIds(self.results.layers).length > 0) {
                            self.showFilters(self.profile);
                            self.showLayers(self.results.layers);
                        } else {
                            self.showNoResults();
                        }
                    }
                );
            },

            /**
             * Fires the 'add-map-control' event. The mol.map.MapEngine handles
             * this event and adds the display to the map.
             */
            fireEvents: function() {
                var params = {
                    display: this.display,
                    slot: mol.map.ControlDisplay.Slot.BOTTOM,
                    position: google.maps.ControlPosition.TOP_LEFT
                },
                event = new mol.bus.Event('add-map-control', params);

                this.bus.fireEvent(event);
            },

            /**
             * Handles layers (results) to display by updating the result list
             * and filters.
             *
             * layers:
             *    0:
             *      name: "Coturnix delegorguei"
             *      source: "eafr"
             *      type: "points"
             *
             * @param layers an array of layers
             */
            showLayers: function(layers) {
                var display = this.display;

                display.clearResults();

                // Set layer results in display.
                 _.each(
                    this.display.setResults(this.getLayersWithIds(layers)),
                    function(result) {
                    // TODO: Wire up results.
                    },
                    this
                  );
                this.display.noResults.hide();
                this.display.results.show();
                this.display.toggle(true);
            },
            /*
             * Displays a message when no results are returned from the search query.
             */
            showNoResults: function() {
                this.display.clearFilters();
                this.display.results.hide();
                this.display.noResults.show();
                this.display.toggle(true);
            },
            /**
             * Returns an array of layer objects {id, name, type, source}
             * with their id set given an array of layer objects
             * {name, type, source}.
             */
            getLayersWithIds: function(layers) {
                return  _.map(
                    layers,
                    function(layer) {
                        return _.extend(layer, {id: mol.core.getLayerId(layer)});
                    }
                );
            },

            showFilters: function(profile) {
                var display = this.display,
                layerNames = profile.getKeys('names'),
                sourceNames = profile.getKeys('sources'),
                typeNames = profile.getKeys('types');

                display.clearFilters();

                // Set name options in display.
                _.each(
                    display.setOptions('Names', layerNames),
                    function (option) {
                        option.click(this.optionClickCallback(option, 'Names'));
                    },
                    this
                );

                // Set source options in display.
                _.each(
                    display.setOptions('Sources', sourceNames),
                    function (option) {
                        option.click(this.optionClickCallback(option, 'Sources'));
                    },
                    this
                );

                // Set type options in display.
                _.each(
                    display.setOptions('Types', typeNames),
                    function (option) {
                        option.click(this.optionClickCallback(option, 'Types'));
                    },
                    this
                );

            },

            /**
             * Returns a function that styles the option as selected and removes
             * the selected styles from all other items. This is what gets fired
             * when a filter option is clicked.
             *
             * @param filter mol.map.results.FilterDisplay
             * @param option the filter option display
             */
            optionClickCallback: function(option, filterName) {
                var self = this;

                return function(event) {
                    self.display.clearOptionSelections(filterName);
                    option.addClass('selected');
                    self.updateDisplay();
                };
            },

            /**
             * When a filter is clicked, the search display results are
             * dynamically updated to match name, source, and type. This
             * is the function that makes that happen. It calculates the
             * new layers (results) that are viewable and calls the
             * handleResults() function.
             *
             */
            updateDisplay: function() {
                var name = this.display.getOptions('Names', true)[0].attr('id'),
                source = this.display.getOptions('Sources', true)[0].attr('id'),
                type = this.display.getOptions('Types', true)[0].attr('id'),
                layers = this.profile.getNewLayers(
                    name !== 'All' ? name : null,
                    source !== 'All' ? source : null,
                    type !== 'All'? type : null);

                this.showLayers(layers);
            }
        }
    );

    /**
     * The main display for search results. Contains a search box, a search
     * results list, and search result filters. This is the thing that gets
     * added to the map as a control.
     */
    mol.map.results.ResultsDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-LayerControl-Results">' +
                    '  <div class="filters"></div>' +
                    '  <div class="searchResults widgetTheme">' +
                    '    <div class="results">' +
                    '      <div class="resultHeader">' +
                    '         Results' +
                    '         <a href="#" class="selectNone">none</a>' +
                    '         <a href="#" class="selectAll">all</a>' +
                    '      </div>' +
                    '      <ol class="resultList"></ol>' +
                    '      <div class="pageNavigation">' +
                    '         <button class="addAll">Map Selected Layers</button>' +
                    '      </div>' +
                    '    </div>' +
                    '    <div class="noresults">' +
                    '      <h3>No results found.</h3>' +
                    '    </div>' +
                    '  </div>' +
                    '</div>';

                this._super(html);
                this.resultList = $(this.find('.resultList'));
                this.filters = $(this.find('.filters'));
                this.selectAllLink = $(this.find('.selectAll'));
                this.selectNoneLink = $(this.find('.selectNone'));
                this.addAllButton = $(this.find('.addAll'));
                this.results = $(this.find('.results'));
                this.noResults = $(this.find('.noresults'));
            },

            clearResults: function() {
                this.resultList.html('');
            },

            clearFilters: function() {
                this.filters.html('');
            },

            /**
             * Makes all options for a filter unselected.
             */
            clearOptionSelections: function(filterName) {
                _.each(
                    this.getOptions(filterName),
                    function(option) {
                        option.removeClass('selected').addClass('option');
                    }
                );
            },

            toggleSelections: function(showOrHide) {
                $('.checkbox').each(
                    function() {
                        $(this).attr('checked', showOrHide);
                    }
                );
            },

            /**
             * Returns an array of jquery result objects that are checked.
             */
            getChecked: function() {
                var checked = _.filter(
                    this.resultList.children(),
                    function(result) {
                        if ($(result).find('.checkbox').attr('checked')) {
                            return true;
                        } else {
                            return false;
                        }
                    },
                    this
                );

                return _.map(
                    checked,
                    function(result) {
                        return $(result);
                    }
                );
            },

            /**
             * Sets the results and returns them as an array of JQuery objects.
             *
             * @param layers An array of layer objects {id, name, type, source}
             */
            setResults: function(layers) {
                return _.map(
                    layers,
                    function(layer) {
                        var id = layer.id,
                            name = layer.name,
                            result = new mol.map.results.ResultDisplay(name, id);
                            result.sourcePng[0].src = 'static/maps/search/'+layer.source+'.png';
                            result.typePng[0].src = 'static/maps/search/'+layer.type+'.png';
                        this.resultList.append(result);
                        return result;
                    },
                    this
                );
            },

            /**
             * Sets the options for a filter and returns the options as an array
             * of JQuery objects.
             */
            setOptions: function(filterName, optionNames) {
                var self = this,
                filter = new mol.map.results.FilterDisplay(filterName),
                options =  _.map(
                    optionNames,
                    function(name) {
                        var option = new mol.map.results.OptionDisplay(name);
                        filter.options.append(option);
                        return option;
                    }
                );

                filter.attr('id', filterName);
                this.filters.append(filter);
                return _.union([filter.allOption], options);
            },

            /**
             * Returns an array of filter options as JQuery objects. If
             * selected is true, only returns options that are selected.
             */
            getOptions: function(filterName, selected) {
                var filter = this.filters.find('#{0}'.format(filterName)),
                options =  _.filter(
                    filter.find('.option'),
                    function(option) {
                        var opt = $(option);

                        if (!selected) {
                            return true;
                        } else if (opt.hasClass('selected')) {
                            return true;
                        } else {
                            return false;
                        }
                    }
                );

                return _.map(
                    options,
                    function(option) {
                        return $(option);
                    }
                );
            }
        }
    );
    /**
     * The display for a single search result that lives in the result list.
     *
     * @param parent the .resultList element in search display
     */
    mol.map.results.ResultDisplay = mol.mvp.View.extend(
        {
            init: function(name, id) {
                var html = '' +
                    '<div>' +
                    '<ul id="{0}" class="result">' +
                    '<div class="resultSource"><button><img class="source" src=""></button></div>' +
                    '<div class="resultType" ><button ><img class="type" src=""></button></div>' +
                    '<div class="resultName">{1}' +
                    '  <div class="resultNomial" ></div>' +
                    '  <div class="resultAuthor"></div>' +
                    '</div>' +
                    '<div class="resultLink"><a href="#" class="info">more info</a></div>' +
                    '<div class="buttonContainer"> ' +
                    '  <input type="checkbox" class="checkbox" /> ' +
                    '  <span class="customCheck"></span> ' +
                    '</div> ' +
                    '</ul>' +
                    '<div class="break"></div>' +
                    '</div>';

                this._super(html.format(id, name));

                this.infoLink = $(this.find('.info'));
                this.nameBox = $(this.find('.resultName'));
                this.sourcePng = $(this.find('.source'));
                this.typePng = $(this.find('.type'));
            }
        }
    );

    /**
     * The display for a single search result filter. Allows you to select a name,
     * source, or type and see only matching search results.
     */
    mol.map.results.FilterDisplay = mol.mvp.View.extend(
        {
            init: function(name) {
                var html = '' +
                    '<div class="filter widgetTheme">' +
                    '    <div class="filterName">{0}</div>' +
                    '    <div class="options"></div>' +
                    '</div>';

                this._super(html.format(name));
                this.name = $(this.find('.filterName'));
                this.options = $(this.find('.options'));
                this.allOption = new mol.map.results.OptionDisplay('All');
                this.allOption.addClass('selected');
                this.options.append(this.allOption);
            }
        }
    );

    mol.map.results.OptionDisplay = mol.mvp.View.extend(
        {
            init: function(name) {
                this._super('<div id="{0}" class="option">{0}</div>'.format(name, name));
            }
        }
    );


    /**
     * This class supports dynamic search result filtering. You give it a name,
     * source, type, and search profile, and you get back all matching results
     * that satisfy those constraints. This is the thing that allows you to
     * click on a name, source, or type and only see those results.
     *
     * TODO: This could use a refactor. Lot's of duplicate code.
     */
    mol.map.results.SearchProfile = Class.extend(
        {
            init: function(response) {
                this.response = response;
            },

            /**
             * Gets layer names that satisfy a name, source, and type combined
             * constraint.
             *
             * @param name the layer name
             * @param source the layer source
             * @param type the layer type
             * @param profile the profile to test
             *
             */
            getNewLayers: function(name, source, type, profile) {
                var layers = this.getLayers(name, source, type, profile);

                return _.map(
                    layers,
                    function(layer) {
                        return this.getLayer(parseInt(layer));
                    },
                    this
                );
            },

            getLayers: function(name, source, type, profile) {
                var response = this.response,
                currentProfile = profile ? profile : 'nameProfile',
                nameProfile = name ? response.names[name] : null,
                sourceProfile = source ? response.sources[source] : null,
                typeProfile = type ? response.types[type] : null,
                profileSatisfied = false;

                if (!name && !type && !source){
                    var keys = new Array();
                    for (i in response.layers) {
                        keys.push(i);
                    };
                    return keys;
                }

                switch (currentProfile) {

                case 'nameProfile':
                    if (!name) {
                        return this.getLayers(name, source, type, 'sourceProfile');
                    }

                    if (nameProfile) {
                        if (!source && !type) {
                            return nameProfile.layers;
                        }
                        if (source && type) {
                            if (this.exists(source, nameProfile.sources) &&
                                this.exists(type, nameProfile.types)) {
                                return _.intersect(
                                    nameProfile.layers,
                                    this.getLayers(name, source, type, 'sourceProfile'));
                            }
                        }
                        if (source && !type) {
                            if (this.exists(source, nameProfile.sources)) {
                                return _.intersect(
                                    nameProfile.layers,
                                    this.getLayers(name, source, type, 'sourceProfile'));
                            }
                        }
                        if (!source && type) {
                            if (this.exists(type, nameProfile.types)) {
                                return _.intersect(
                                    nameProfile.layers,
                                    this.getLayers(name, source, type, 'typeProfile'));
                            }
                        }
                    }
                    return [];

                case 'sourceProfile':
                    if (!source) {
                        return this.getLayers(name, source, type, 'typeProfile');
                    }

                    if (sourceProfile) {
                        if (!name && !type) {
                            return sourceProfile.layers;
                        }
                        if (name && type) {
                            if (this.exists(name, sourceProfile.names) &&
                                this.exists(type, sourceProfile.types)) {
                                return _.intersect(
                                    sourceProfile.layers,
                                    this.getLayers(name, source, type, 'typeProfile'));
                            }
                        }
                        if (name && !type) {
                            if (this.exists(name, sourceProfile.names)) {
                                return sourceProfile.layers;
                            }
                        }
                        if (!name && type) {
                            if (this.exists(type, sourceProfile.types)) {
                                return _.intersect(
                                    sourceProfile.layers,
                                    this.getLayers(name, source, type, 'typeProfile'));
                            }
                        }
                    }
                    return [];

                case 'typeProfile':
                    if (!type) {
                        return [];
                    }

                    if (typeProfile) {
                        if (!name && !source) {
                            return typeProfile.layers;
                        }
                        if (name && source) {
                            if ( this.exists(name, typeProfile.names) &&
                                 this.exists(source, typeProfile.sources)) {
                                return typeProfile.layers;
                            }
                        }
                        if (name && !source) {
                            if (this.exists(name, typeProfile.names)) {
                                return typeProfile.layers;
                            }
                        }
                        if (!name && source) {
                            if (this.exists(source, typeProfile.sources)) {
                                return typeProfile.layers;
                            }
                        }
                    }
                    return [];
                }
                return [];
            },

            getLayer: function(layer) {
                return this.response.layers[layer];
            },

            getKeys: function(id) {
                var res;
                switch(id.toLowerCase()){
                case "types":
                    res = this.response.types;
                    break;
                case "sources":
                    res = this.response.sources;
                    break;
                case "names":
                    res = this.response.names;
                    break;
                }
                return _.keys(res);
            },

            getTypeKeys: function() {
                var x = this.typeKeys,
                types = this.response.types;
                return x ? x : (this.typeKeys = _.keys(types));
            },

            getType: function(type) {
                return this.response.types[type];
            },

            getSourceKeys: function() {
                var x = this.sourceKeys,
                sources = this.response.sources;
                return x ? x : (this.sourceKeys = _.keys(sources));
            },

            getSource: function(source) {
                return this.response.sources[source];
            },

            getNameKeys: function() {
                var x = this.nameKeys,
                names = this.response.names;
                return x ? x : (this.nameKeys = _.keys(names));
            },

            getName: function(name) {
                return this.response.names[name];
            },

            /**
             * Returns true if the name exists in the array, false otherwise.
             */
            exists: function(name, array) {
                return _.indexOf(array, name) != -1;
            }
        }
    );
};
mol.modules.map.search = function(mol) {

    mol.map.search = {};

    mol.map.search.SearchEngine = mol.mvp.Engine.extend(
        {
            /**
             * @param bus mol.bus.Bus
             */
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
                this.sql = '' +
                    'SET STATEMENT_TIMEOUT TO 0; ' + // Secret konami workaround for 40 second timeout.
                    'SELECT ' +
                    'p.provider as source, p.scientificname as name, p.type as type ' +
                    'FROM polygons as p ' +
                    'WHERE p.scientificname = \'{0}\' ' +
                    'UNION SELECT ' +
                    't.provider as source, t.scientificname as name, t.type as type ' +
                    'FROM points as t ' +
                    'WHERE t.scientificname = \'{1}\'';
            },

            /**
             * Starts the SearchEngine. Note that the container parameter is
             * ignored.
             */
            start: function() {
                this.display = new mol.map.search.SearchDisplay();
                this.display.toggle(true);
                this.addEventHandlers();
                this.fireEvents();
            },

            /**
             * Adds a handler for the 'search-display-toggle' event which
             * controls display visibility. Also adds UI event handlers for the
             * display.
             */
            addEventHandlers: function() {
                var self = this;

                /**
                 * Callback that toggles the search display visibility. The
                 * event is expected to have the following properties:
                 *
                 *   event.visible - true to show the display, false to hide it.
                 *
                 * @param event mol.bus.Event
                 */
                this.bus.addHandler(
                    'search-display-toggle',
                    function(event) {
                        var params = null,
                            e = null;

                        if (event.visible === undefined) {
                            self.display.toggle();
                            params = {visible: self.display.is(':visible')};
                        } else {
                            self.display.toggle(event.visible);
                        }

                        e = new mol.bus.Event('results-display-toggle', params);
                        self.bus.fireEvent(e);
                    }
                );

                /**
                 * Clicking the go button executes a search.
                 */
                this.display.goButton.click(
                    function(event) {
                        self.search(self.display.searchBox.val());
                    }
                );

                /**
                 * Clicking the cancel button hides the search display and fires
                 * a cancel-search event on the bus.
                 */
                this.display.cancelButton.click(
                    function(event) {
                        var params = {
                            visible: false
                        };

                        self.display.toggle(false);
                        self.bus.fireEvent(
                            new mol.bus.Event('results-display-toggle', params));
                    }
                );

                /**
                 * Pressing the return button clicks the go button.
                 */
                this.display.searchBox.keyup(
                    function(event) {
                      if (event.keyCode === 13) {
                        self.display.goButton.click();
                      }
                    }
                );
            },

            /**
             * Fires the 'add-map-control' event. The mol.map.MapEngine handles
             * this event and adds the display to the map.
             */
            fireEvents: function() {
                var params = {
                        display: this.display,
                        slot: mol.map.ControlDisplay.Slot.TOP,
                        position: google.maps.ControlPosition.TOP_LEFT
                    },
                    event = new mol.bus.Event('add-map-control', params);

                this.bus.fireEvent(event);
            },

            /**
             * Searches CartoDB via proxy using a term from the search box. Fires
             * a search event on the bus. The success callback fires a search-results
             * event on the bus.
             *
             * @param term the search term (scientific name)
             */
            search: function(term) {
                var self = this,
                    sql = this.sql.format(term, term),
                    params = {sql:sql, term: term},
                    action = new mol.services.Action('cartodb-sql-query', params),
                    success = function(action, response) {
                        var results = {term:term, response:response},
                            event = new mol.bus.Event('search-results', results);
                        self.display.loading.hide();
                        self.bus.fireEvent(event);
                    },
                    failure = function(action, response) {
                        self.display.loading.hide();
                    };
                this.display.loading.show();
                this.proxy.execute(action, new mol.services.Callback(success, failure));
                this.bus.fireEvent('search', new mol.bus.Event('search', term));
            }
        }
    );

    mol.map.search.SearchDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-LayerControl-Search">' +
                    '  <div class="searchContainer widgetTheme">' +
                    '    <div class="title">Search:</div>' +
                    '    <input class="value" type="text" placeholder="Search by name">' +
                    '    <button class="execute">Go</button>' +
                    '    <button class="cancel">' +
                    '      <img src="/static/maps/search/cancel.png">' +
                    '    </button>' +
                    '  </div>' +
                    '  <img class="loading" src="/static/loading.gif">' +
                    '</div>';

                this._super(html);
                this.goButton = $(this.find('.execute'));
                this.cancelButton = $(this.find('.cancel'));
                this.searchBox = $(this.find('.value'));
                this.loading = $(this.find('.loading'));
            },

            clear: function() {
                this.searchBox.html('');
            }
        }
    );
};
/**
 * This module handles add-layers events and layer-toggle events. tI basically 
 * proxies the CartoDB JavaScript API for adding and removing CartoDB layers
 * to and from the map.
 */
mol.modules.map.tiles = function(mol) {

    mol.map.tiles = {};

    /**
     * Based on the CartoDB point density gallery example by Andrew Hill at
     * Vizzuality (andrew@vizzuality.com).
     *
     * @see http://developers.cartodb.com/gallery/maps/densitygrid.html
     */
    mol.map.tiles.TileEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus, map) {
                this.proxy = proxy;
                this.bus = bus;
                this.map = map;
                this.addEventHandlers();
            },

            addEventHandlers: function() {
                var self = this;

                /**
                 * Handler for when the layer-toggle event is fired. This renders
                 * the layer on the map if visible, and removes it if not visible.
                 *  The event.layer is a layer object {id, name, type, source}. event.showing
                 * is true if visible, false otherwise.
                 */
                this.bus.addHandler(
                    'layer-toggle',
                    function(event) {
                        var showing = event.showing,
                            layer = event.layer;
                        
                        if (showing) {
                            self.renderTiles([layer]);
                        } else { // Remove layer from map.
                            self.map.overlayMapTypes.forEach(
                                function(maptype, index) {
                                    if (maptype.name === layer.id) {
                                        self.map.overlayMapTypes.removeAt(index);
                                    }
                                }
                            );
                        }
                    }
                );
                
                /**
                 * Handler for zoom to extent events. The event has a layer 
                 * object {id, name, source, type}.
                 */
                this.bus.addHandler(
                    'layer-zoom-extent',
                    function(event) {
                        var layer = event.layer;
                        self.zoomToExtent(layer);
                    }
                );

                /**
                 * Hanlder for changing layer opacity. Note that this only works 
                 * for polygon layers since point layers are rendered using image
                 * sprites for performance. The event.opacity is a number between 
                 * 0 and 1.0 and the event.layer is an object {id, name, source, type}.
                 */
                this.bus.addHandler(                    
                    'layer-opacity',
                    function(event) {
                        var layer = event.layer,
                            opacity = event.opacity;
    
                        self.map.overlayMapTypes.forEach(
                            function(maptype, index) {
                                if (maptype.name === layer.id) {
                                    self.map.overlayMapTypes.removeAt(index);
                                    layer.opacity = opacity;
                                    self.renderTiles([layer]);
                                }
                            }
                        );                        
                    }
                );

                /**
                 * Handler for when the add-layers event is fired. This renders
                 * the layers on the map by firing a add-map-layer event. The
                 * event.layers is an array of layer objects {name:, type:}.
                 */
                this.bus.addHandler(
                    'add-layers',
                    function(event) {
                        self.renderTiles(event.layers);
                    }
                );

            },

            /**
             * Renders an array a tile layers by firing add-map-overlays event
             * on the bus.
             *
             * @param layers the array of layer objects {name, type}
             */
            renderTiles: function(layers) {
                var tiles = [],
                    overlays = this.map.overlayMapTypes.getArray(),
                    newLayers = this.filterLayers(layers, overlays);

                _.each(
                    newLayers,
                    function(layer) {
                        tiles.push(this.getTile(layer, this.map));
                        $(this.map.loading).show();
                        $("img",this.map.overlayMapTypes).imagesLoaded(this.tilesLoaded.bind(this));
                    },
                    this
                );
            },

            /*
             *  Jquery imagesLoaded callback to turn off the loading indicator 
             *  once the overlays have finished.
             *  @param images array of img tile elements.
             *  @param proper array of img elements properly loaded.
             *  @param broken array of broken img elements..
             */
            tilesLoaded: function(images, proper, broken) {
                $(this.map.loading).hide();
            },
            
            /**
             * Returns an array of layer objects that are not already on the map.
             *
             * @param layers an array of layer object {id, name, type, source}.
             * @params overlays an array of wax connectors.
             */
            filterLayers: function(layers, overlays) {
                var layerIds = _.map(
                        layers,
                        function(layer) {
                            return layer.id;
                        }
                    ),
                    overlayIds = _.map(
                        overlays,
                        function(overlay) {
                            return overlay.name;
                        }
                    ),
                    ids = _.without(layerIds, overlayIds);

                return _.filter(
                    layers,
                    function(layer) {
                        return (_.indexOf(ids, layer.id) != -1);
                    },
                    this
                );
            },

            /**
             * Closure around the layer that returns the ImageMapType for the tile.
             */
            getTile: function(layer) {
                var name = layer.name,
                    type = layer.type,
                    tile = null;

                switch (type) {
                case 'points':
                    new mol.map.tiles.CartoDbTile(layer, 'points', this.map);
                    break;
                case 'polygon':
                case 'range':
                case 'expert opinion range map':
                    new mol.map.tiles.CartoDbTile(layer, 'polygons', this.map);
                    break;
                }
            },
            
            /**
             * Zooms and pans the map to the full extent of the layer. The layer is an 
             * object {id, name, source, type}.
             */
	         zoomToExtent: function(layer) {
                var self = this,
                    sql = "SELECT ST_Extent(the_geom) FROM {0} WHERE scientificname='{1}'",
                    table = layer.type === 'points' ? 'points' : 'polygons',
                    query = sql.format(table, layer.name),
                    params = {
                        sql: query
                    },
                    action = new mol.services.Action('cartodb-sql-query', params),
                    success = function(action, response) {
                        var extent = response.rows[0].st_extent,
                            c = extent.replace('BOX(','').replace(')','').split(','),
                            coor1 = c[0].split(' '),
                            coor2 = c[1].split(' '),
                            sw = null,
                            ne = null,
                            bounds = null;
		    	        
                        sw = new google.maps.LatLng(coor1[1],coor1[0]);
                        ne = new google.maps.LatLng(coor2[1],coor2[0]);
                        bounds = new google.maps.LatLngBounds(sw, ne);
		                  self.map.fitBounds(bounds);
		                  self.map.panToBounds(bounds);
		              },
		              failure = function(action, response) {
                        console.log('Error: {0}'.format(response));
                    };
                this.proxy.execute(action, new mol.services.Callback(success, failure));            
		      }	    
        }
	 );

    mol.map.tiles.CartoDbTile = Class.extend(
        {
            init: function(layer, table, map) {
                var sql =  "SELECT * FROM {0} where scientificname = '{1}'",
                    opacity = layer.opacity && table !== 'points' ? layer.opacity : null,
                    tile_style = opacity ? "#{0}{polygon-fill:#99cc00;polygon-opacity:{1};}".format(table, opacity) : null;
                
                this.layer = new google.maps.CartoDBLayer(
                    {
                        tile_name: layer.id,
                        map_canvas: 'map_container',
                        map: map,
                        user_name: 'mol',
                        table_name: table,
                        query: sql.format(table, layer.name),
                        tile_style: tile_style,
                        map_style: true,
                        infowindow: true,
                        opacity: opacity
                    }
                );
            }
        }
    );
};

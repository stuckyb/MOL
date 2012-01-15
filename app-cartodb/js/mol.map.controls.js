mol.modules.map.controls = function(mol) { 
    
    mol.map.controls = {};

    mol.map.controls.SearchEngine = mol.mvp.Engine.extend(
        {
            /**
             * @param bus mol.bus.Bus
             */
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
                this.sql = '' +
                    'SELECT ' + 
                    'p.provider as source, p.scientificname as name, p.type as type ' +
                    //', ST_AsText(ST_SetSRID(ST_Box2D(p.the_geom), 4326)) as extent ' +
                    'FROM mol_rangemaps as p ' +
                    'WHERE st_isvalid(p.the_geom) AND p.scientificname @@ to_tsquery(\'{0}\') ' +
                    'UNION SELECT ' +
                    't.provider as source, t.scientificname as name, t.type as type ' +
                    //', ST_AsText(ST_SetSRID(ST_Box2D(t.the_geom), 4326)) as extent ' +
                    'FROM eafr as t ' +
                    'WHERE st_isvalid(t.the_geom) AND t.scientificname @@ to_tsquery(\'{1}\') ';
            },
            
            /**
             * Starts the SearchEngine. Note that the container parameter is 
             * ignored.
             */
            start: function(container) {
                this.display = new mol.map.controls.SearchDisplay();
                this.display.engine(this);
                this.display.toggle(false);
                this.display.resultPanel.toggle(false);
                this.addEventHandlers();
                this.fireEvents();
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
                        self.display.toggle(event.visible);
                    }
                );

                this.display.goButton.click(
                    function(event) {
                        self.search(self.display.searchBox.val());
                    }
                );

                this.display.searchBox.keyup(
                    function(event) {
                      if (event.keyCode === 13) {
                        self.display.goButton.click();
                      }
                    }
                );

            },

            /**
             * Searches CartoDB using a term from the search box. If successful, 
             * the callback dispatches to the results() function.
             * 
             * @param term the search term (scientific name)
             */
            search: function(term) {
                var self = this,
                    sql = this.sql.format(term, term),
                    params = {sql:sql, term: term},
                    action = new env.services.Action('cartodb-sql-query', params),
                    callback = new env.services.Callback(
                        function(action, response) { // Success.
                            console.log(action.type + ' success: ' + JSON.stringify(response));
                            self.results(response);
                        }, 
                        function(action, response) { // Failure.
                            console.log(action.type + ' failure: ' + response);
                        });
                
                this.proxy.execute(action, callback);
            },

            /**
             * Converts the CartoDB sql response into a search profile and updates 
             * the results display.
             * 
             * @param response the CartoDB sql response
             */
            results: function(response) {
                var searchProfile = mol.services.cartodb.convert(response),
                    resultList = this.display.resultList,
                    filters = this.display.filters,
                    layer = null,
                    srd = null,
                    i = null;

                this.profile = new mol.map.controls.SearchProfile(searchProfile); 

                resultList.html(''); 
                _.each(
                    searchProfile.layers,
                    function (layer) {
                        srd = new mol.map.controls.SearchResultDisplay(resultList);
                        srd.name.text(layer.name);                        
                    }
                );

                filters.html(''); 
                _.each(
                    ['Names','Sources','Types'],
                    function(name) {
                    }
                );

                this.display.resultPanel.toggle(true);
            }
        }
    );

    mol.map.controls.SearchDisplay = mol.mvp.Display.extend(
        {
            init: function() {
                var html = '' +
                    '<div>' +
                    '<div class="mol-LayerControl-Search widgetTheme">' + 
                    '  <div class="title">Search:</div>' + 
                    '  <input class="value" type="text" placeholder="Search by name">' + 
                    '  <button class="execute">Go</button>' + 
                    '  <button class="cancel"><img src="/static/maps/search/cancel.png"></button>' + 
                    '</div>' + 
                    '<div class="mol-LayerControl-Results">' + 
                    '  <div class="filters">' + 
                    '  </div>' + 
                    '  <div class="searchResults widgetTheme">' + 
                    '    <div class="resultHeader">' +
                    '       Results' +
                    '       <a href="" class="selectNone">none</a>' +
                    '       <a href="" class="selectAll">all</a>' +
                    '    </div>' + 
                    '    <ol class="resultList"></ol>' + 
                    '    <div class="pageNavigation">' + 
                    '       <button class="addAll">Map Selected Layers</button>' + 
                    '    </div>' + 
                    '  </div>' + 
                    '</div>' +
                    '</div>';

                this._super(html);
                this.goButton = new mol.mvp.View(this.find('.execute'));
                this.results = new mol.mvp.View(this.find('.mol-LayerControl-Results'));
                this.searchBox = new mol.mvp.View(this.find('.value'));
                this.resultPanel = new mol.mvp.View(this.find('.mol-LayerControl-Results'));
                this.resultList = new mol.mvp.View(this.find('.resultList'));
                this.filters = new mol.mvp.View(this.find('.filters'));
            }            
        }
    );

    /**
     * A display for a single search result.
     * 
     * @param parent the .resultList element in search display
     */
    mol.map.controls.SearchResultDisplay = mol.mvp.Display.extend(
        {
            init: function(parent) {
                var html = '' +
                    '<div>' +
                    '<ul class="result">' + 
                    '<div class="resultSource"><button><img class="source" src=""></button></div>' + 
                    '<div class="resultType" ><button ><img class="type" src=""></button></div>' +
                    '<div class="resultName">' + 
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

                this._super(html, parent);
                this.typePng = new mol.mvp.View(this.find('.type'));
                this.sourcePng = new mol.mvp.View(this.find('.source'));
                this.name = new mol.mvp.View(this.find('.resultName'));
                this.author = new mol.mvp.View(this.find('.resultAuthor'));
                this.infoLink = new mol.mvp.View(this.find('.info'));
            }
        }
    );

    mol.map.controls.SearchProfile = Class.extend(
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
                            mol.log.info('source no type');
                            if (this.exists(source, nameProfile.sources)) {
                                mol.log.info('return intersect(name.layers, sourceprofile');
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
                                mol.log.info('returning source layers');
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

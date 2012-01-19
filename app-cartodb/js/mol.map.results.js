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
                 * Callback that toggles the search display visibility. The 
                 * event is expected to have the following properties:
                 * 
                 *   event.visible - true to show the display, false to hide it.
                 * 
                 * @param event mol.bus.Event
                 */
                this.bus.addHandler(
                    'results-display-toggle',                    
                    function(event) {                        
                        self.display.toggle(event.visible);
                    }
                );
                
                this.bus.addHandler(
                    'search-results',
                    function(event) {
                        self.results = mol.services.cartodb.convert(event.response);
                        self.profile = new mol.map.results.SearchProfile(self.results);
                        console.log(self.results);
                        self.showFilters(self.profile);
                        self.showLayers(self.results.layers);
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
                var display = this.display,
                    layerNames = _.map(
                        layers,
                        function(layer) {
                            return layer.name;
                        }
                    );
                
                display.clearResults();

                // Set layer results in display.
                _.each(
                    this.display.setResults(layerNames),
                    function(result) {
                        // TODO: Wire event listeners to result.
                    }
                );

                this.display.toggle(true);
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
                var name = this.display.getOptions('Names', true)[0],
                    source = this.display.getOptions('Sources', true)[0],
                    type = this.display.getOptions('Types', true)[0],
                    layers = this.profile.getNewLayers(
                        name ? name.attr('id') : name, 
                        source ? source.attr('id') : source,
                        type ? type.attr('id') : type);

                this.showLayers(layers);                
            }
        }
    );

    /**
     * The main display for search results. Contains a search box, a search 
     * results list, and search result filters. This is the thing that gets
     * added to the map as a control.
     */
    mol.map.results.ResultsDisplay = mol.mvp.Display.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-LayerControl-Results">' + 
                    '  <div class="filters"></div>' + 
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
                    '</div>';

                this._super(html);
                this.resultList = $(this.find('.resultList'));
                this.filters = $(this.find('.filters'));
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

            /**
             * Sets the results and returns them as an arrya of JQuery objects.
             * 
             * @param names the result names              
             */
            setResults: function(names) {
                var self = this;
                
                return _.map(
                    names,
                    function(name) {
                        var result = new mol.map.results.ResultDisplay(name);
                        self.resultList.append(result);
                        return result;
                    }
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
                return options;
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
    mol.map.results.ResultDisplay = mol.mvp.Display.extend(
        {
            init: function(name) {
                var html = '' +
                    '<div>' +
                    '<ul class="result">' + 
                    '<div class="resultSource"><button><img class="source" src=""></button></div>' + 
                    '<div class="resultType" ><button ><img class="type" src=""></button></div>' +
                    '<div class="resultName">{0}' + 
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

                this._super(html.format(name));

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
    mol.map.results.FilterDisplay = mol.mvp.Display.extend(
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
            }
        }
    );
      
    mol.map.results.OptionDisplay = mol.mvp.Display.extend(
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

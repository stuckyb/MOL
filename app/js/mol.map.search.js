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
                    'SELECT ' + 
                    'p.provider as source, p.scientificname as name, p.type as type ' +
                    //', ST_AsText(ST_SetSRID(ST_Box2D(p.the_geom), 4326)) as extent ' +
                    'FROM polygons as p ' +
                    'WHERE st_isvalid(p.the_geom) AND p.scientificname @@ to_tsquery(\'{0}\') ' +
                    'UNION SELECT ' +
                    't.provider as source, t.scientificname as name, t.type as type ' +
                    //', ST_AsText(ST_SetSRID(ST_Box2D(t.the_geom), 4326)) as extent ' +
                    'FROM points as t ' +
                    'WHERE st_isvalid(t.the_geom) AND t.scientificname @@ to_tsquery(\'{1}\') ';
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
                        self.bus.fireEvent(event);
                    }, 
                    failure = function(action, response) {
                    };
                
                this.proxy.execute(action, new mol.services.Callback(success, failure));
                this.bus.fireEvent('search', new mol.bus.Event('search', term));
            }
        }
    );
    
    mol.map.search.SearchDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-LayerControl-Search widgetTheme">' + 
                    '  <div class="title">Search:</div>' + 
                    '  <input class="value" type="text" placeholder="Search by name">' + 
                    '  <button class="execute">Go</button>' + 
                    '  <button class="cancel">' +
                    '    <img src="/static/maps/search/cancel.png">' +
                    '  </button>' + 
                    '</div>';

                this._super(html);
                this.goButton = $(this.find('.execute'));
                this.cancelButton = $(this.find('.cancel'));
                this.searchBox = $(this.find('.value'));
            },
            
            clear: function() {
                this.searchBox.html('');
            }
        }
    );    
};

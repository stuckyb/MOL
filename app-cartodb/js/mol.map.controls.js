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
                    'FROM mol_rangemaps as p ' +
                    'WHERE p.scientificname @@ to_tsquery(\'{0}\') ' +
                    'UNION SELECT ' +
                    't.provider as source, t.scientificname as name, t.type as type ' +
                    'FROM eafr as t ' +
                    'WHERE t.scientificname @@ to_tsquery(\'{1}\')';
            },
            
            /**
             * Starts the SearchEngine. Note that the container parameter is 
             * ignored.
             */
            start: function(container) {
                this.display = new mol.map.controls.SearchDisplay();
                this.display.engine(this);
                this.display.toggle(false);
                this.display.results.toggle(false);
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

                /**
                 * Callback 
                 */
                this.display.goButton.click(
                    function(event) {
                        self.search(self.display.searchBox.val());
                    }
                );
            },

            search: function(term) {
                var sql = this.sql.format(term, term),
                    params = {sql:sql},
                    action = null,
                    callback = null;

                action = new env.services.Action('cartodb-sql-query', params);
                callback = new env.services.Callback(
                    function(action, response) { 
                        console.log(action.type + ': ' + JSON.stringify(response));
                    }, 
                    function(action, response) {
                        console.log(action.type + ': ' + response);
                    });

                this.proxy.execute(action, callback);
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
            },

            toggle: function(visibility) {
                this.toggle(visibility);
            }
        }
    );
};

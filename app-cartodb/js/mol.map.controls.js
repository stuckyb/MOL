mol.modules.map.controls = function(mol) { 
    
    mol.map.controls = {};

    mol.map.controls.SearchEngine = mol.mvp.Engine.extend(
        {
            /**
             * @param bus mol.bus.Bus
             */
            init: function(api, bus) {
                this.api = api;
                this.bus = bus;
            },
            
            /**
             * Starts the SearchEngine. Note that the container parameter is 
             * ignored.
             */
            start: function(container) {
                this.display = new mol.map.controls.SearchDisplay();
                this.display.engine(this);
                this.display.toggle(false);
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
             * controls display visibility.
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
            }
        }
    );

    mol.map.controls.SearchDisplay = mol.mvp.Display.extend(
        {
            init: function() {
                var html = '' +
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
                    '</div>';

                this._super(html);
            },

            toggle: function(visibility) {
                this.toggle(visibility);
            }
        }
    );
};

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
    
        
            

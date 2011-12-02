/**
 * Allow customly add layers with information like username and tablename
 */
MOL.modules.Add = function(mol) {
	mol.ui.Add = {};
	
	mol.ui.Add.Display = mol.ui.Display.extend(
		{
			init: function(config) {
                this._super(this._html());
			},
			_html: function() {
				return	'<div class="mol-LayerControl-Search widgetTheme">' + 
		                '  <div class="title">Add:</div>' + 
		                '</div>';
			}
		}
	);
	
	/**
	 * The add engine
	 */
	mol.ui.Add.Engine = mol.ui.Engine.extend(
        {
        	/**
             * Constructs the engine.
             * 
             * @constructor
             */
            init: function(api, bus) {
                this._api = api;
                this._bus = bus;
            },
            
            /**
             * Starts the engine by creating and binding the display.
             *
             * @override mol.ui.Engine.start
             */
            start: function(container) {
                var text = {
                	table: 'Table name',
                	user: 'Username'
                };
                this._bindDisplay(new mol.ui.Add.Display(), text);
            },

            /**
             * Gives the engine a new place to go based on a browser history
             * change.
             * 
             * @override mol.ui.Engine.go
             */
            go: function(place) {
            	
            },
            
            /**
             * Binds the display.
             */
            _bindDisplay: function(display, text) {   
                this._display = display;
                display.setEngine(this);
                
                this._addLayerControlEventHandler();
                
                display.hide();
                this._addDisplayToMap();
            },
            
            /**
             * Fires a MapControlEvent so that the display is attached to
             * the map as a control in the TOP_LEFT position.
             */
            _addDisplayToMap: function() {
                var MapControlEvent = mol.events.MapControlEvent,
                    display = this._display,
                    bus = this._bus,
                    DisplayPosition = mol.ui.Map.Control.DisplayPosition,
                    ControlPosition = mol.ui.Map.Control.ControlPosition,
                    action = 'add',
                    config = {
                        display: display,
                        action: action,
                        displayPosition: DisplayPosition.TOP,
                        controlPosition: ControlPosition.TOP_LEFT
                    };
                bus.fireEvent(new MapControlEvent(config));     
            },
            
            /**
             * Adds an event handler for LayerControlEvent events so that a
             * 'add-click' action will show the search display as a control
             * on the map.
             */
            _addLayerControlEventHandler: function() {
                var display = this._display,
                    bus = this._bus,
                    LayerControlEvent = mol.events.LayerControlEvent;
                
                bus.addHandler(
                    LayerControlEvent.TYPE,
                    function(event) {
                        var action = event.getAction(),
                            displayNotVisible = !display.isVisible();               
                        
                        if (action === 'add-click' && displayNotVisible) {
                            display.show();
                        }
                    }
                );
            }
        }
    );
}
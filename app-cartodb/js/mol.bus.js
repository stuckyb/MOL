/**
 * Events module for working with application events. Contains a Bus object that
 * is used to bind event handlers and to trigger events.
 */
mol.modules.bus = function(mol) {

    mol.bus = {};
    
    /**
     * Events have a type and an action. For example, you might have a map event 
     * that represents a click action (map is the type, click is the action. 
     * Events also have optional config object that contains other parameters.
     * 
     */
    mol.bus.Event = Class.extend(
        {
            /**
             * Constructs a new event. 
             * 
             * @param type the event type
             * @param action the event action
             * @param config optional event configuration
             */
            init: function(type, action, config) {
                this.type = type;
                this.action = action;
                this.config = config;
            }
        }
    );

    /**
     * An event bus. You can fire events on the bus and add event handlers.
     * 
     */
    mol.bus.Bus = function() {

        if (!(this instanceof mol.bus.Bus)) {
            return new mol.bus.Bus();
        }
        _.extend(this, Backbone.Events);

        /**
         * Fires an event on the event bus.
         * 
         * @param event the event to fire
         */
        this.fireEvent = function(event) {
            this.trigger(event.getType(), event);
        };

        /**
         * Adds an event handler for an event type.
         * 
         * @param type the event type
         * @param handler the event handler callback function
         */
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


    /**
     * Place event.
     */
    mol.bus.LocationEvent = mol.bus.Event.extend(
        {
            init: function(location, action, refresh) {
                this.super('LocationEvent', action);
                this.location = location;
                this.refresh = refresh;
            },

            getRefresh: function() {                
                return this.refresh;
            },

            getLocation: function() {
                return this.location;
            }
        }
    );
    mol.bus.LocationEvent.TYPE = 'LocationEvent';

    /**
     * Event for colors.
     */
    mol.bus.ColorEvent = mol.bus.Event.extend(
        {
            init: function(config) {
                this.super('ColorEvent', config.action);
                this.color = config.color;
                this.category = config.category;
                this.id = config.id;
            },
            
            getColor: function() {
                return this.color;
            },
            
            getCategory: function() {
                return this.category;
            },

            getId: function() {
                return this.id;
            }            
        }
    );
    mol.bus.ColorEvent.TYPE = 'ColorEvent';

    /**
     * Event for layers.
     */
    mol.bus.LayerEvent = mol.bus.Event.extend(
        {

            init: function(config) {
                this.super('LayerEvent', config.action);
                this.layer = config.layer;
                this.zoomLayerIds = config.zoomLayerIds;
            },

            getLayer: function() {
                return this.layer;
            },


            getZoomLayerIds: function() {
                return this.zoomLayerIds;
            }
        }
    );
    mol.bus.LayerEvent.TYPE = 'LayerEvent';

    /**
     * Trigger this event if you generate layer control actions such as 'Add' 
     * or 'Delete'.
     * 
     * Supported actions:
     *     add-click
     *     delete-click   
     */
    mol.bus.LayerControlEvent = mol.bus.Event.extend(
        {
            init: function(action, layerId, zoomLayerIds) {
                this.super('LayerControlEvent', action);
                this.layerId = layerId;
            },
            
            getLayerId: function() {
                return this.layerId;
            }
        }
    );
    mol.bus.LayerControlEvent.TYPE = 'LayerControlEvent';

    /**
     * Trigger this event to add a map control widget on the map at a position.
     */
    mol.bus.MapControlEvent = mol.bus.Event.extend(
        {
            /**
             * Constructs a new MapControlEvent object.
             * 
             * @constructor
             * 
             * @param div - the div element of the display to add to map control
             * @param controlPosition - mol.ui.Map.Control.ControlPosition
             * @param displayPosition - mol.ui.Map.Control.DisplayPosition
             * @param action - the action (add, remove)
             */
            init: function(config) {
                this.super('MapControlEvent');
                this.display = config.display;
                this.controlPosition = config.controlPosition;
                this.displayPosition = config.displayPosition;
                this.action = config.action;
            },
            
            /**
             * Gets the widget.
             * 
             * @return widget
             */
            getDisplay: function() {
                return this.display;
            },

            /**
             * Gets the control position.
             * 
             * @return controlPosition
             */
            getControlPosition: function() {
                return this.controlPosition;
            },

            /**
             * Gets the display position within the control.
             */
            getDisplayPosition: function() {
                return this.displayPosition;                
            },

            /**
             * Gets the action.
             * 
             * @return action
             */
            getAction: function() {
                return this.action;
            }
        }
    );
    mol.bus.MapControlEvent.TYPE = 'MapControlEvent';

    
    // Event types:
    mol.bus.ADD_MAP_CONTROL = 'add_map_control';

    mol.bus.NEW_LAYER = 'new_layer';
    mol.bus.DELETE_LAYER = 'delete_layer';
//    mol.bus.SET_LAYER_COLOR = 'set_layer_color';
    mol.bus.GET_NEXT_COLOR = 'get_next_color';
    mol.bus.NEXT_COLOR = 'next_color';
    mol.bus.COLOR_CHANGE = 'color_change';
    

};

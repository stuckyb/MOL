mol.modules.map.basemap = function(mol) {

    mol.map.basemap = {};

    mol.map.basemap.BaseMapEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus, map) {
                this.proxy = proxy;
                this.bus = bus;
                this.map = map;
            },

            /**
             * Starts the MenuEngine. Note that the container parameter is
             * ignored.
             */
            start: function() {
                this.display = new mol.map.basemap.BaseMapControlDisplay();
                this.display.toggle(true);
                this.addEventHandlers();
                this.fireEvents();
            },

            setBaseMap: function(type) {
                    if(type=="Basic") {
                        type="ROADMAP";
                    }
                    this.map.setMapTypeId(google.maps.MapTypeId[type.toUpperCase()])
            },
            /**
             * Adds a handler for the 'search-display-toggle' event which
             * controls display visibility. Also adds UI event handlers for the
             * display.
             */
            addEventHandlers: function() {
                var self = this;
                _.each(
                    $(this.display).find(".button"),
                    function(button) {
                        $(button).click(
                            function(event) {
                                self.setBaseMap($(this).text());
                            }
                        );
                    }
                );

                this.bus.addHandler(
                    'basemap-display-toggle',
                    function(event) {
                        var params = null,
                        e = null;

                        if (event.visible === undefined) {
                            self.display.toggle();
                            params = {visible: self.display.is(':visible')};
                        } else {
                            self.display.toggle(event.visible);
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
                        slot: mol.map.ControlDisplay.Slot.FIRST,
                        position: google.maps.ControlPosition.BOTTOM_LEFT
                    },
                    event = new mol.bus.Event('add-map-control', params);

                this.bus.fireEvent(event);
            }
        }
    );

    mol.map.basemap.BaseMapControlDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-BaseMapControl">' +
                        '<div class="label">Base Map:</div>' +
                        '<div title="Basic Base Map (water and boundaries only)" class="widgetTheme button">Basic</div>' +
                        //'<div title="Road Base Map" class="widgetTheme button">Roads</div>' +
                        '<div title="Terrain Base Map" class="widgetTheme button">Terrain</div>' +
                        '<div title="Satellite Base Map" class="widgetTheme button">Satellite</div>' +
                    '</div>';

                this._super(html);

            }
        }
    );
};




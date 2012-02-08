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
                this.map = new google.maps.Map(this.element, mapOptions);
                google.maps.event.addListener(
                        this.map,
                        'zoom_changed',
                        this.mapZoomChanged.bind(this)
                );
                google.maps.event.addListener(
                        this.map,
                        'tilesloaded',
                        this.mapTilesLoaded.bind(this)
                );
                google.maps.event.addListener(
                        this.map,
                        'drag',
                        this.checkBounds.bind(this, event)
                );
                google.maps.event.addListener(
                        this.map,
                        'center_changed',
                        this.checkBounds.bind(this, event)
                );



            },
            /*
             *  Google map event handler to show layer loading gifs when the zoom level changes.
             */

            mapZoomChanged : function (event) {

                this.map.overlayMapTypes.forEach(
                      function(layer) {
                         $('.mol-LayerControl-Layers #'+layer.name+' .loading')[0].style.visibility = 'visible';
                     }
                );
                this.checkBounds().bind(this,event);
            },
            /*
             * Google map event handler to hide layer loading gifs after tiles are finished loading..
             */
            mapTilesLoaded : function(event) {
                this.map.overlayMapTypes.forEach(
                      function(layer) {
                         $('.mol-LayerControl-Layers #'+layer.name+' .loading')[0].style.visibility = 'hidden';
                  }
                );
            },
            /*
             * Google map event handler to keep within valid latitudes.
             * Crazy latitudes result in CartoDB tile errors, until we can handle these better,
             * keep the map within normal values.
             */
            checkBounds : function (event) {
/*
                    var enforce=false, dx, dy, x, y, miny, maxy;

                    x = this.map.getCenter().lng();
                    y = this.map.getCenter().lat();

                    miny = this.map.getBounds().getSouthWest().lat();
                    maxy = this.map.getBounds().getNorthEast().lat();
                    dy = maxy-miny;

                    if(this.map.minLat!=undefined) {
                        if (miny < this.map.minLat) {
                               miny = this.map.minLat;
                               maxy = miny + dy;
                               enforce=true;
                        }
                    }
                    if(this.map.maxLat!=undefined) {
                        if (maxy > this.map.maxLat) {
                            maxy = this.map.maxLat;
                            miny = maxy - dy;
                            enforce=true;
                        }
                    }
                    if(enforce==true) {
                           try {
                               this.map.setCenter(new google.maps.LatLng(x,(miny+maxy)/2));
                           } catch (e) {}
                    }*/

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
                //this.selectable({disabled: true});
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

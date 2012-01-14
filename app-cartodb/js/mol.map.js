mol.modules.map = function(mol) { 
    
    mol.map = {};

    mol.map.MapEngine = mol.mvp.Engine.extend(
        {
            init: function(api, bus) {
                this.api = api;
                this.bus = bus;
                this.controlDisplays = {};
                this.controlDivs = {};
                this.mapLayers = {};
            },            
            
            start: function(container) {
                this.display = new mol.map.MapDisplay(null, container);
                this.display.engine(this);
                this.addControls();
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
                c = new ControlDisplay('RightControl').element;
                controls[ControlPosition.TOP_RIGHT].clear();
                controls[ControlPosition.TOP_RIGHT].push(c);
                                
                // Add top center map control.
                c = new ControlDisplay('CenterTopControl').element;
                controls[ControlPosition.TOP_CENTER].clear();
                controls[ControlPosition.TOP_CENTER].push(c);

                // Add top left map control.
                c = new ControlDisplay('TopLeftControl').element;
                controls[ControlPosition.TOP_LEFT].clear();
                controls[ControlPosition.TOP_LEFT].push(c);
                
                // Add bottom left map control.
                c = new ControlDisplay('LeftBottomControl').element;
                controls[ControlPosition.BOTTOM_LEFT].clear();
                controls[ControlPosition.BOTTOM_LEFT].push(c);
            }
        }
    );

    mol.map.MapDisplay = mol.mvp.Display.extend(
        {
            init: function(element, parent) {
                this._super(element, parent);

                var mapOptions = null;

                mapOptions = { 
                    zoom: 2,
                    maxZoom: 15,
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
                this.attr('id', 'map');
                this.map = new google.maps.Map(this.element, mapOptions);
            }
        }
    );

    /**
     * This display is a container with support for adding composite displays in
     * a top, middle, and bottom slot. It gets attached to a map control positions.
     * 
     */
    mol.map.ControlDisplay = mol.mvp.Display.extend(
        {
            init: function(name) {
                var Slot = mol.map.ControlDisplay.Slot,
                    className = 'mol-Map-' + name,
                    html = '<div>' +
                           '    <div class="TOP"></div>' +
                           '    <div class="MIDDLE"></div>' +
                           '    <div class="BOTTOM"></div>' +
                           '</div>';

                this._super(html);
                this.attr('class', className);                
                this.selectable({disabled: true});
                this.find(Slot.TOP).attr('class', 'TOP');
                this.find(Slot.MIDDLE).attr('class', 'MIDDLE');
                this.find(Slot.BOTTOM).attr('class', 'BOTTOM');
            },

            slot: function(display, slot) {
                var Slot = mol.map.ControlDisplay.Slot,
                    div = this.find(slot);

                switch (slot) {             
                case Slot.FIRST:
                    this.prepend(display);
                    break;
                case Slot.LAST:
                    this.append(display);
                    break;
                default:            
                    div.append(display);
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

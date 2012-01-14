mol.modules.map = function(mol) { 
    
    mol.map = {};

    mol.map.MapEngine = mol.mvp.Engine.extend(
        {
            init: function(api, bus) {
                this.api = api;
                this.bus = bus;
                this.controlDivs = {};
                this.mapLayers = {};
            },            
            
            start: function(container) {
                this.display = new mol.map.MapDisplay(null, container);
                this.display.engine(this);
            },

            go: function(place) {
            },

            place: function() {
            }
        }
    );

    mol.map.MapDisplay = mol.mvp.Display.extend(
        {
            init: function(element, parent) {
                var mapOptions = null;

                this._super(element, parent);

                mapOptions = { 
                    zoom: 2,
                    maxZoom: 15,
                    mapTypeControlOptions: { position: google.maps.ControlPosition.BOTTOM_LEFT},
                    center: new google.maps.LatLng(0,0),
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                    styles: [
                        {"featureType":"all",
                         "elementType":"all",
                         "stylers":[{"lightness":43},{"visibility":"simplified"},{"saturation":-59}]
                        },
                        {
                            "elementType":"labels","stylers":[{"visibility":"on"}]
                        }
                        
                    ]
                }; 
                this.attr('id', 'map');
                this.map = new google.maps.Map(this.element, mapOptions);
            }
        }
    );
};

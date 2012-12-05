mol.modules.map.feature = function(mol) {
    
    mol.map.feature = {};
    
    mol.map.feature.FeatureEngine = mol.mvp.Engine.extend({
        init : function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            //TODO add
            this.url = 'http://mol.cartodb.com/api/v2/sql?callback=?&q={0}';
            //TODO add
            this.sql = "SELECT * FROM get_features('{0}',{1},'{2}')";
            
            this.clickDisabled = false;
        },

        start : function() {
            this.addFeatureDisplay();
            this.addEventHandlers();
        },
        
        addEventHandlers : function () {
            var self = this;
            
            this.bus.addHandler(
                'layer-click-toggle',
                function(event) {
                    self.clickDisabled = event.disable;
                }
            );
                
            //may want to wait to add this until ready
            google.maps.event.addListener(
                self.map,
                "click",
                function (mouseevent) {
                    var reqLays = [],
                        tolerance = 5,
                        sql;
                        
                    if(!self.clickDisabled && 
                        self.map.overlayMapTypes.length > 0) {
                        
                        //latlng
                        mouseevent.latLng;
                        
                        //pixels
                        tolerance;
                        
                        //layer id list
                        self.map.overlayMapTypes.forEach(
                            function(mt) {
                                if(mt.opacity != 0) {
                                    reqLays.push(mt.name);
                                }
                            }  
                        );       

                        
                        sql = self.sql.format(
                                mouseevent.latLng.toString(),
                                tolerance,
                                reqLays.toString()
                        );
                        
                        console.log(self.map.overlayMapTypes);   
                        
                        
                        //make request
                        $.getJSON(
                            self.url.format(sql),
                            function(data, textStatus, jqXHR) {
                                var results = {
                                        latlng: mouseevent.latLng,
                                        response: data
                                    },
                                    e = new mol.bus.Event(
                                        'feature-results',
                                        results
                                    );
                                    
                                //call process results    
                                    
                                self.bus.fireEvent(e);
                            }
                        );
                        
                    }
                }
            );
            
            this.bus.addHandler(
                'feature-results',
                function(event) {
                    self.showFeatures(event.params);
                }
            );
        },
        
        addFeatureDisplay : function() {
            this.display = new mol.map.FeatureDisplay();
        },
        
        showFeatures: function(params) {
            var infowindow = new google.maps.InfoWindow();
            infowindow.setPosition(params.latlng);
            
            console.log("showFeatures");
            //$('.mol-Map-FeatureDisplay')
            
            
            //infowindow.setContent();
            //infowindow.open(self.map);
            
        }
    });
    
    mol.map.FeatureDisplay = mol.mvp.View.extend({
        init : function(names) {
            var className = 'mol-Map-FeatureDisplay',
                html = '' +
                    '<div></div>';

            this._super(html);
        }
    });
}


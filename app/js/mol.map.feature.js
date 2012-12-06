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
            this.sql = "SELECT * FROM " + 
                       "get_map_feature_metadata({0},{1},{2},{3},'{4}')";
            
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

                        self.map.overlayMapTypes.forEach(
                            function(mt) {
                                if(mt.opacity != 0) {
                                    reqLays.push(mt.name);
                                }
                            }  
                        );       

                        
                        sql = self.sql.format(
                                mouseevent.latLng.lng(),
                                mouseevent.latLng.lat(),
                                tolerance,
                                self.map.getZoom(),
                                reqLays.toString()
                        );
                        
                        $.getJSON(
                            self.url.format(sql),
                            function(data, textStatus, jqXHR) {
                                var results = {
                                        latlng: mouseevent.latLng,
                                        response: data
                                    },
                                    e;
                                    
                                console.log("results");
                                console.log(data);
                                    
                                //call process results   
                                
                                self.processResults(data.rows);
                                
                                 
                                e = new mol.bus.Event(
                                        'feature-results', 
                                        results
                                    );    
                                self.bus.fireEvent(e);
                                
                                
                            }
                        );
                    }
                }
            );
            
            this.bus.addHandler(
                'feature-results',
                function(event) {
                    self.showFeatures(event);
                }
            );
        },
        
        addFeatureDisplay : function() {
            
            this.display = new mol.map.FeatureDisplay();
            
                        
            console.log($(this.display));
            console.log($(this.display)[0]);
            
        },
        
        processResults: function(rows) {
            var self = this,
                content,
                inside = '',
                o,
                vs,
                i,
                head,
                title;
                
            //TODO remove everything from $(self.display);   

            _.each(rows, function(row) {
                console.log("row");
                
                o = JSON.parse(row.layer_features);
                vs = _.values(o)[0][0];
                
                head = _.keys(o)[0].split("--");
                
                content = '' + 
                '<h3><a href="#">' + head[1] + " - " + head[3] + '</a></h3>' +
                '<div>' + inside + '</div>';
                
                if(_.isObject(vs)) {
                    for(i=0;i < _.keys(vs).length; i++) {
                        inside+=''+
                            '<p>' + _.keys(vs)[i] + " : " 
                                    + _.values(vs)[i] + '</p>';
                    }
                }
                
                console.log("content");
                console.log(content);
                
                $(self.display).append(content);
                
                
            });
            
            console.log($(self.display));
            console.log($(self.display)[0]);
        },
        
        showFeatures: function(params) {
            var self = this;
            
            var infowindow = new google.maps.InfoWindow();
            infowindow.setPosition(params.latlng);
            
            $(self.display).accordion();
                        
            infowindow.setContent($(self.display)[0]);
            infowindow.open(self.map);            
        }
    });
    
    mol.map.FeatureDisplay = mol.mvp.View.extend({
        init : function(names) {
            var className = 'mol-Map-FeatureDisplay',
                html = '' +
                    '<div id="accordion"></div>';

            this._super(html);
        }
    });
}


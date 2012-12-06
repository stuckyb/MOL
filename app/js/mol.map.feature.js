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
        },
        
        processResults: function(rows) {
            var self = this,
                o,
                vs,
                head,
                content,
                inside;

            self.display = new mol.map.FeatureDisplay();

            _.each(rows, function(row) {
                var i,
                    k;

                o = JSON.parse(row.layer_features);
                vs = _.values(o)[0][0];
                
                head = _.keys(o)[0].split("--");
                
                if(_.isObject(vs)) {
                    content = '' + 
                        '<h3>' + 
                        '  <a href="#">' + head[1] + " - " + head[3] + '</a>' + 
                        '</h3>';
                    
                    inside = '';
                    
                    for(i=0;i < _.keys(vs).length; i++) {
                        k = _.keys(vs)[i];
                        inside+='<p>' + k + " : " + vs[k] + '</p>';          
                    }
                    
                    content+='<div>' + inside + '</div>';
                    
                    $(self.display).find('#accordion').append(content);
                }
            });
        },
        
        showFeatures: function(params) {
            var self = this;
            
            $(self.display).find('#accordion').accordion({fillSpace: true});
            
            //getter
            //var autoHeight = $(self.display).find('#accordion').accordion( "option", "autoHeight" );
            //setter
            //$(self.display).find('#accordion').accordion( "option", "autoHeight", false );
            
            self.display.dialog({
                autoOpen: true,
                width: 280,
                height: 450,
                dialogClass: 'mol-Map-FeatureDialog',
                modal: false,
                title: "temp"
                /*
                title: speciestotal + ' species of ' + className +
                       ' within ' + listradius.radius/1000 + ' km of ' +
                       Math.abs(Math.round(
                           listradius.center.lat()*1000)/1000) +
                           '&deg;&nbsp;' + latHem + '&nbsp;' +
                       Math.abs(Math.round(
                           listradius.center.lng()*1000)/1000) +
                           '&deg;&nbsp;' + lngHem
                */
            });            
        }
    });
    
    mol.map.FeatureDisplay = mol.mvp.View.extend({
        init : function(names) {
            var className = 'mol-Map-FeatureDisplay',
                html = '' +
                    '<div class="' + className + '" style="height: 400px">' +
                        '<div id="accordion" ></div>' +
                    '</div>';
                //in-line div height     

            this._super(html);
        }
    });
}


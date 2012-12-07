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
                sp,
                content,
                inside;

            self.display = new mol.map.FeatureDisplay();

            _.each(rows, function(row) {
                var i,
                    k;

                o = JSON.parse(row.layer_features);
                vs = _.values(o)[0][0];
                
                head = _.keys(o)[0].split("--");
                sp = head[1].replace("_", " ");
                sp = sp.charAt(0).toUpperCase() + sp.slice(1);
                
                console.log("vs");
                console.log(vs);
                console.log(vs["Source"]);
                
                if(_.isObject(vs)) {
                    content = '' + 
                        '<h3>' + 
                        '  <a href="#">' + sp + " - " + vs["Source"] + '</a>' + 
                        '</h3>';
                    
                    inside = '';
                    
                    for(i=0;i < _.keys(vs).length; i++) {
                        k = _.keys(vs)[i];
                        inside+='<div class="itemPair">' + 
                                '  <div class="featureItem">' + k + ': </div>' + 
                                '  <div class="featureData">' + vs[k] + '</div>' + 
                                '</div>';          
                    }
                    
                    content+='<div>' + inside + '</div>';
                    
                    $(self.display).find('#accordion').append(content);
                }
            });
        },
        
        showFeatures: function(params) {
            var self = this;

            $(self.display).find('#accordion').accordion({
                                                    autoHeight: false, 
                                                    clearStyle: true});
                                                    
            self.display.dialog({
                autoOpen: true,
                width: 350,
                minHeight: 250,
                dialogClass: 'mol-Map-FeatureDialog',
                modal: false,
                title: 'At ' +
                       Math.round(params.latlng.lat()*1000)/1000 +
                       ', ' +
                       Math.round(params.latlng.lng()*1000)/1000
            });            
        }
    });
    
    mol.map.FeatureDisplay = mol.mvp.View.extend({
        init : function(names) {
            var className = 'mol-Map-FeatureDisplay',
                html = '' +
                    '<div class="' + className + '">' +
                        '<div id="accordion" ></div>' +
                    '</div>';
                //in-line div height     

            this._super(html);
        }
    });
}


mol.modules.map.editor = function(mol) {

    mol.map.editor = {};

    mol.map.editor.EditorEngine = mol.mvp.Engine.extend({
        init : function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            //this.editor = new google.maps.drawing.DrawingManager();
        },

        start : function() {
            this.addEventHandlers();
            //disable all map clicks
            this.toggleMapLayerClicks(false);
        },
        
        toggleMapLayerClicks : function(boo) {            
            //true to disable
            this.bus.fireEvent(
                new mol.bus.Event('layer-click-toggle', {disable: boo}));          
        },
        addEditableLayer : function (json) {
            var self = this;
            this.layer = [];
            if(this.editer = undefined) {
                this.editor = new google.maps.drawing.DrawingManager({
                      drawingMode: google.maps.drawing.OverlayType.MARKER,
                      drawingControl: true,
                      drawingControlOptions: {
                        position: google.maps.ControlPosition.TOP_CENTER,
                        drawingModes: [
                          google.maps.drawing.OverlayType.POLYGON,
                          google.maps.drawing.OverlayType.MARKER
                        ]
                      },
                      polygonOptions: {
                        fillColor: '#ffff00',
                        fillOpacity: 1,
                        strokeWeight: 5,
                        clickable: true,
                        zIndex: 1,
                        editable: true
                      }
                    });
                this.editor.setMap(this.map);
            }
            
            _.each(
                json.rows,
                function(row) {
                    var geojson = JSON.parse(row.geom),
                        feature = new GeoJSON(geojson);
                    if(feature.setMap != undefined) {
                        //feature.draggable=true;
                        feature.editable=true;
                        feature.setMap(self.map)
                    } else {
                    
                        _.each(
                            feature,
                            function(f) {
                                if(f.setMap != undefined) {
                                    //f.draggable=true;
                                    f.editable=true;
                                    f.setMap(self.map);
                                }
                                self.layer.push(f);
                            }
                        );
                    }
                }
            );
            
            
        },
        addEventHandlers : function () {
            var self = this;
            /*
             *  Makes a layer editable by removing it from teh map and adding it
             *  back as an editable polygon, simplified to match the zoom level
             */
            this.bus.addHandler(
                'edit-layer',
                function(event) {
                    var layer = event.layer,
                        gridres = 40075000/(256^self.map.getZoom()), 
                        sql = 'SELECT ' +
                            'ST_AsGeoJson(ST_Transform(' +
                                'ST_Simplify(ST_SnapToGrid(the_geom_webmercator,1000),10000)' +
                                ',4326)' +
                            ') as geom ' +
                            'FROM get_tile(\'{1}\',\'{2}\',\'{3}\',\'{4}\')';
                        url = mol.services.cartodb.sqlApi.jsonp_url.format(
                            sql.format(
                                gridres,
                                layer.source,
                                layer.type,
                                layer.name,
                                layer.dataset_id
                            )
                        )
                        
                    $.getJSON(
                        url,
                        self.addEditableLayer.bind(self)
                    );
                }
            )
        },
    });

    mol.map.EditorDisplay = mol.mvp.View.extend({
        init : function(names) {
            var className = 'mol-Map-EditorDisplay',
                html = '' +
                    '<button class="edit">' +
                        'Edit' 
                    '</button>';

            this._super(html);
            this.editButton=$(this).find('.edit');
        }
    });
};

mol.modules.map.editor = function(mol) {

    mol.map.editor = {};

    mol.map.editor.EditorEngine = mol.mvp.Engine.extend({
        init : function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.map.editable_layers = []; //array of user defined layers.
        },

        start : function() {
            this.addEditorDisplay();
            this.addEventHandlers();
            //disable all map clicks
            this.toggleMapLayerClicks(false);
        },

        toggleMapLayerClicks : function(boo) {
            //true to disable
            this.bus.fireEvent(
                new mol.bus.Event('layer-click-toggle', {disable: boo}));
        },
        addEditorDisplay : function() {
            var params = {
                display: null,
                slot: mol.map.ControlDisplay.Slot.TOP,
                position: google.maps.ControlPosition.TOP_RIGHT
            };

            this.display = new mol.map.editor.EditorControlDisplay();
            params.display = this.display;
            this.bus.fireEvent(new mol.bus.Event('add-map-control', params));
        },
        addEditableLayer : function (json, status, xhr) {
            var self = this;
            //this.layer = [];
            if(this.editor == undefined) {
                this.editor = new google.maps.drawing.DrawingManager({
                      drawingMode: google.maps.drawing.OverlayType.POLYGON,
                      drawingControl: true,
                      drawingControlOptions: {
                        position: google.maps.ControlPosition.TOP_CENTER,
                        drawingModes: [
                          google.maps.drawing.OverlayType.POLYGON
                        ]
                      },
                      polygonOptions: {
                        editable: true
                      }
                });
                google.maps.event.addListener(
                    this.editor, 
                    'overlaycomplete', 
                    this.overlayComplete.bind(self)
                );
            }
            this.editor.setMap(this.map);
            this.editor.polygonOptions.name = this.current_layer.id;
            this.bus.fireEvent(new mol.bus.Event('hide-loading-indicator', {source: this.current_layer.dataset_id }))
            
            _.each(
                json.rows,
                function(row) {
                    var geojson = JSON.parse(row.geom),
                        feature = new GeoJSON(geojson);
                    if(feature.setMap != undefined) {
                        //feature.draggable=true;
                        feature.setOptions({editable:true, clickable:true, name: self.current_layer.id});
                        google.maps.event.addListener(
                            feature,
                            'click',
                            self.handleFeatureClick.bind(self, {id: self.current_layer.id, overlay: feature})  
                        );
                        feature.setMap(self.map);
                        self.map.editable_layers.push({id: self.current_layer.id, overlay: feature});
                    } else {

                        _.each(
                            feature,
                            function(f) {
                                if(f.setMap != undefined) {
                                    //f.draggable=true;
                                    f.setOptions({editable:true, name: self.current_layer.id});
                                    google.maps.event.addListener(
                                        f,
                                        'click',
                                        self.handleFeatureClick.bind(self, {id: self.current_layer.id, overlay: f})  
                                    );
                                    f.setMap(self.map);
                                }
                                self.map.editable_layers.push({id: self.current_layer.id, overlay: f});
                            }
                        );
                    }
                }
            );
            this.bus.fireEvent(new mol.bus.Event('add-layers',{layers:[this.current_layer]}));
        },
        overlayComplete: function (event) {
            var self = this;
            event.id = this.current_layer.id;
            google.maps.event.addListener(
                event.overlay,
                'click',
                self.handleFeatureClick.bind(self, event)
            );
            this.map.editable_layers.push(event);
        },
        handleFeatureClick: function(event) {
            var display = new mol.map.editor.FeatureOptionsDisplay(event);
            
            display.cancel.click(
                function(e) {
                    display.dialog('close');
                }
            );
            display.del.click(
                function(e) {
                    event.overlay.setMap(null);
                    display.dialog('close');
                }
            );
            $(display).dialog();
        },
        defineRange: function () {
            var name = prompt(
                'This feature creates a new range map based on the currently ' +
                'visible layers. What species (scientific name) would you like ' +
                'to define a range for?'
            );
            if (name) {
                this.startEditing(name);
            }
        },
        exportToWKT: function(polygon) { 
             var numPoints = polygon.getVertexCount(); 
             var mp = "MULTIPOLYGON ((("; 
             for(var i=0; i < numPoints; i++) { 
                var lat = polygon.getVertex(i).lat(); 
                var lng = polygon.getVertex(i).lng(); 
                mp += lng + " "+ lat + ","; 
             } 
             mp = mp.replace(/,$/,""); 
             mp += ")))" 
             return mp; 
        },
        startEditing: function(name) {
            //TODO: zoom to max layer extent
            //first get a very simplified convex hull of all available maps
            var layers = [], //all current layers
                key = '{0}{1}'.format(name, new Date().getTime()), //unique layer id
                tiles = [],
                gridres = 40075000/(256^this.map.getZoom()),
                tilesql = ''+
                    'SELECT {0} as geom '+
                    'FROM get_tile(\'{1}\',\'{2}\',\'{3}\',\'{4}\')';
                sql = '' +
                    'SELECT ST_AsGeoJson(' +
                            'ST_Transform(' +
                                'ST_Simplify(' +
                                    'ST_Union(' +
                                        'ST_Buffer(g.geom,0)' +
                                    '),' +
                                    '200000' +
                                '),' +
                                '4326' +
                            ')' +
                        ') as geom ' +
                    'FROM ({0}) g ';
            this.current_layer = {
                    name: name,
                    type:'custom',
                    type_title: 'User defined layer.',
                    source_title: 'Web user',
                    source_type: 'webuser',
                    source_type_title: 'Web user',
                    source:'webuser',
                    dataset_id: key,
                    id: 'layer--{0}--custom--webuser--{1}'
                        .format(name.replace(/ /g, '_'),
                        key),
                    names: '',
                    type_sort_order: 0
            };
            //make an array of layer ids
            this.map.overlayMapTypes.forEach(
                function(mt,i) {
                    if(mt.name.split('--')[2]!='points') {
                        layers.push(mt.name);
                    }
                }
            )
            tiles = _.map(
                layers,
                function(layer) {
                    var collectsql = (layer.split('--')[2] == 'points') ?
                        'ST_SnapToGrid(ST_ConcaveHull(' +
                            'ST_Collect('+
                                'the_geom_webmercator'+
                            '),' +
                            '0.90' +
                        '),50000)' :
                        ' ST_SnapToGrid(the_geom_webmercator,10000) ',
                        source = layer.split('--')[3], //source
                        type = layer.split('--')[2], //type
                        name = layer.split('--')[1],
                        dataset_id = layer.split('--')[4];
                    name = '{0}{1}'
                        .format(name[0].toUpperCase(),name.substr(1))
                        .replace('_', ' ');

                    return tilesql.format(
                            collectsql,
                            source,
                            type,
                            name,
                            dataset_id
                    );
                }
            );
            
            this.bus.fireEvent(new mol.bus.Event('show-loading-indicator', {source: this.current_layer.dataset_id }))
            $.getJSON(
                mol.services.cartodb.sqlApi.jsonp_url.format(
                    sql.format(
                        tiles.join(' UNION ')
                    )
                ),
                this.addEditableLayer.bind(this)
            );
        },
        addEventHandlers : function () {
            var self = this;
            /*
             *  Makes a layer editable by removing it from the map and adding it
             *  back as an editable polygon, simplified to match the zoom level
             */
            this.display.defineRange.click(
                  function(event) {
                      self.defineRange();
                  }
            );
            this.bus.addHandler(
                'remove-layers',
                function(event) {
                    var layers = event.layers;
                    _.each(
                        layers,
                        function(layer_to_remove) {
                            _.each(
                                self.map.editable_layers,
                                function(existing_layer) {
                                    if(existing_layer.id
                                        == layer_to_remove.id) {
                                        if(existing_layer.overlay.editable) {
                                            self.editor.setMap(null);
                                        }
                                        existing_layer.overlay.setMap(null);
                                        self.map.editable_layers = _.without(
                                            self.map.editable_layers,
                                            existing_layer
                                        );
                                    }
                                }
                            );
                        }
                    )
                }
            );
            /*editing of an existinglayer... TODO!*/
            this.bus.addHandler(
                'edit-layer',
                function(event) {
                    var layer = event.layer,
                        gridres = 40075000/(256^self.map.getZoom()),
                        sql = 'SELECT ' +
                            'ST_AsGeoJson('+
                                'ST_Transform(the_geom_webmercator,4326)' +
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
                    self.map.overlayMapTypes.forEach(
                        function(mt,i) {
                            if(mt.name==layer.id) {
                                self.maptype = self.map.overlayMapTypes.removeAt(i);
                                self.maptype_index = i;
                            }
                        }
                    )
                    $.getJSON(
                        url,
                        self.addEditableLayer.bind(self)
                    );
                }
            );
            /*editing of an existing layer... TODO!*/
            this.bus.addHandler(
                'toggle-editing',
                function(event) {
                    var layer = event.layer;
                            _.each(
                                self.map.editable_layers,
                                function(existing_layer) {
                                    if(existing_layer.id
                                        == layer.id) {
                                        existing_layer.overlay.editable =
                                            !existing_layer.overlay.editable;
                                        if(!existing_layer.overlay.editable) {
                                            self.editor.setMap(null);
                                            //console.log(self.exportToWKT(existing_layer.overlay));
                                        } else {
                                            self.editor.setMap(self.map);
                                        }
                                        existing_layer.overlay.editable_changed();
                                    }
                                }
                            );
                        
                }
            )
        },
    });

    mol.map.editor.EditorControlDisplay = mol.mvp.View.extend({
        init : function(names) {
            var html = '' +
                    '<div class="mol-Map-EditorDisplay widgetTheme">' +
                        '<button class="edit">' +
                            'Define Range' +
                        '</button>' +
                    '</div>';

            this._super(html);

            this.defineRange=$(this).find('.edit');
        }
    });
    mol.map.editor.FeatureOptionsDisplay = mol.mvp.View.extend({
        init : function(names) {
            var html = '' +
                    '<div class="mol-Map-EditorFeatureOptions">' +
                        'Set Seasonality'+
                        '<select class="seasonality">'+
                            '<option value="0">Wintering</option>' +
                            '<option value="0">Wintering</option>' +
                            '<option value="0">Wintering</option>' +
                            '<option value="0">Wintering</option>' +
                            '<option value="0">Wintering</option>' +
                         '</select>' +
                         '<br>' +
                         '<button class="delete">Delete feature</button>' +
                         '<button class="save">Save Changes</button>' +
                         '<button class="cancel">Cancel</button>' +
                    '</div>';
            this._super(html);
            this.del = $(this).find('.delete');
            this.cancel = $(this).find('.cancel');
        }
    });
    mol.map.editor.NewRangeDialog = mol.mvp.View.extend({
            init: function() {
                var html = '' +
                    '<div id="dialog">' +
                        'This feature creates a new range map based on ' +
                        'layers visible on the map.' +
                        '<br>' +
                    '</div>  ';
                this._super(html);

        }
    });
};

/**
 * This module handles add-layers events and layer-toggle events. tI basically
 * proxies the CartoDB JavaScript API for adding and removing CartoDB layers
 * to and from the map.
 */
mol.modules.map.tiles = function(mol) {

    mol.map.tiles = {};

    /**
     * Based on the CartoDB point density gallery example by Andrew Hill at
     * Vizzuality (andrew@vizzuality.com).
     *
     * @see http://developers.cartodb.com/gallery/maps/densitygrid.html
     */
    mol.map.tiles.TileEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.gmap_events = [];
            this.addEventHandlers();
        },

        addEventHandlers: function() {
            var self = this;

            /**
             * Handler for when the layer-toggle event is fired. This renders
             * the layer on the map if visible, and removes it if not visible.
             * The event.layer is a layer object {id, name, type, source}. event.showing
             * is true if visible, false otherwise.
             */
             this.bus.addHandler(
                'layer-toggle',
                function(event) {
                        var showing = event.showing,
                            layer = event.layer,
                            params = null,
                            e = null;

                        if (showing) {
                            self.map.overlayMapTypes.forEach(
                                function(mt, index) {
                                    if (mt != undefined && mt.name == layer.id) {
                                        params = {
                                            layer: layer,
                                            opacity: mt.opacity_visible
                                        };
                                        e = new mol.bus.Event('layer-opacity', params);
                                        self.bus.fireEvent(e);
                                        //if(maptype.interaction != undefined) {
                                        //    maptype.interaction.add();
                                        //    maptype.interacton.clickAction="full"
                                        //}
                                        return;
                                    }
                                }
                            );
                            //self.renderTiles([layer]);
                        } else { // Remove layer from map.
                            self.map.overlayMapTypes.forEach(
                                function(mt, index) {
                                    if (mt != undefined && mt.name == layer.id) {
                                        mt.opacity_visible = mt.opacity;
                                        params = {
                                            layer: layer,
                                            opacity: 0
                                        };
                                        e = new mol.bus.Event(
                                            'layer-opacity',
                                            params
                                        );
                                        self.bus.fireEvent(e);
                                        if(mt.interaction != undefined) {
                                            mt.interaction.remove();
                                            mt.interaction.clickAction="";
                                        }
                                        //self.map.overlayMapTypes.removeAt(index);
                                    }
                                }
                            );
                        }
                    }
                );
                /**
                 * Handler for changing layer opacity. The event.opacity is a
                 * number between 0 and 1.0 and the event.layer is an object
                 * {id, name, source, type}.
                 */
                this.bus.addHandler(
                    'layer-opacity',
                    function(event) {
                        var layer = event.layer,
                            opacity = event.opacity;

                        if (opacity === undefined) {
                            return;
                        }

                        self.map.overlayMapTypes.forEach(
                            function(maptype, index) {
                                if (maptype.name === layer.id) {
                                    maptype.setOpacity(opacity);
                                }
                            }
                        );
                    }
                );

                /**
                 * Handler for applying cartocss style to a layer.
                 */
                this.bus.addHandler(
                    'apply-layer-style',
                    function(event) {
                        var layer = event.layer,
                            style = event.style;

                        self.map.overlayMapTypes.forEach(
                            function(maptype, index) {
                                //find the overlaymaptype to style
                                if(maptype != undefined) {
                                if (maptype.name === layer.id) {
                                    //remove it from the map
                                    self.map.overlayMapTypes.removeAt(index);
                                    //add the style
                                    layer.tile_style = style;
                                    //this is for cdb layers
                                    layer.mode='cdb';
                                    //make the layer
                                    self.getTile(layer);
                                    //fix the layer order
                                    self.map.overlayMapTypes.forEach(
                                        function(newmaptype, newindex) {
                                            var mt,
                                                e,
                                                params = {
                                                    layer: layer,
                                                    opacity: maptype.opacity
                                                };
                                            if(newmaptype.name === layer.id) {
                                                mt = self.map.overlayMapTypes.removeAt(newindex);
                                                self.map.overlayMapTypes.insertAt(index, mt);
                                                e = new mol.bus.Event(
                                                    'layer-opacity',
                                                    params
                                                );
                                                self.bus.fireEvent(e);
                                                return;
                                            }
                                        }
                                    );
                                }
                            }
                            }
                        );



                    }
                );

                /**
                 * Handler for when the add-layers event is fired. This renders
                 * the layers on the map by firing a add-map-layer event. The
                 * event.layers is an array of layer objects {name:, type:}.
                 */
                this.bus.addHandler(
                    'add-layers',
                    function(event) {
                        self.renderTiles(event.layers);
                    }
                );
                /**
                 * Handler for when the toggle-ee-filter event is fired. This
                 * switches the layer's getTile to point to earth engine
                 */
                this.bus.addHandler(
                    'toggle-ee-filter',
                    function(event) {
                        var layer = event.layer;

                        self.map.overlayMapTypes.forEach(
                            function(maptype, index) {
                                //find the overlaymaptype to switch to ee
                                if (maptype != undefined) {
                                    if (maptype.name === layer.id) {
                                        //remove it from the map
                                        if(maptype.interaction != undefined) {
                                            maptype.interaction.remove();
                                            maptype.interaction.clickAction="";
                                        }
                                        self.map.overlayMapTypes.removeAt(index);
                                        //put it back the layer
                                        self.getTile(layer);
                                        //fix the layer order
                                        self.map.overlayMapTypes.forEach(
                                            function(newmaptype, newindex) {
                                                var mt,
                                                    e,
                                                    params = {
                                                        layer: layer,
                                                        opacity: maptype.opacity
                                                    };
                                                if(newmaptype.name === layer.id) {
                                                    mt = self.map.overlayMapTypes.removeAt(newindex);
                                                    self.map.overlayMapTypes.insertAt(index, mt);
                                                    e = new mol.bus.Event(
                                                        'layer-opacity',
                                                        params
                                                    );
                                                    self.bus.fireEvent(e);
                                                    return;
                                                }
                                            }
                                        );
                                    }
                                }
                            }
                        );

                    }
                );
                /**
                 * Handler for when the remove-layers event is fired. This
                 * functions removes all layers from the Google Map. The
                 * event.layers is an array of layer objects {id}.
                 */
                    this.bus.addHandler(
                    'remove-layers',
                    function(event) {
                        var layers = event.layers,
                            mapTypes = self.map.overlayMapTypes;

                        _.each(
                            layers,
                            function(layer) { // "lid" is short for layer id.
                                var lid = layer.id;
                                mapTypes.forEach(
                                    function(mt, index) {
                                        if (mt != undefined && mt.name === lid) {
                                            if(mt.interaction != undefined) {
                                                mt.interaction.remove();
                                            }
                                            mapTypes.removeAt(index);
                                        }
                                    }
                                );
                            }
                        );
                    }
                );

                    /**
                     * Handler for when the reorder-layers event is fired. This
                     * renders the layers according to the list of layers
                     * provided
                     */
                    this.bus.addHandler(
                         'reorder-layers',
                         function(event) {
                              var layers = event.layers,
                            mapTypes = self.map.overlayMapTypes;

                              _.each(
                                   layers,
                                   function(lid) { // "lid" is short for layerId.
                                        mapTypes.forEach(
                                             function(mt, index) {
                                                  if ((mt != undefined) &&
                                                      (mt.name === lid)) {
                                                      mapTypes.removeAt(index);
                                                      mapTypes.insertAt(0, mt);
                                                  }
                                             }
                                        );
                                   }
                              );
                         }
                    );
            },

            /**
             * Renders an array a tile layers.
             *
             * @param layers the array of layer objects {name, type}
             */
            renderTiles: function(layers) {
                var overlays = this.map.overlayMapTypes.getArray(),
                    newLayers = this.filterLayers(layers, overlays),
                    self = this;

                _.each(
                    newLayers,
                    function(layer) {
                        var maptype = self.getTile(layer);
                    },
                    self
                );
            },
            /**
             * Returns an array of layer objects that are not already on the
             * map.
             *
             * @param layers an array of layer object {id, name, type, source}.
             * @params overlays an array of wax connectors.
             */
            filterLayers: function(layers, overlays) {
                var layerIds = _.map(
                        layers,
                        function(layer) {
                            return layer.id;
                        }
                    ),
                    overlayIds = _.map(
                        overlays,
                        function(overlay) {
                            return overlay.name;
                        }
                    ),
                    ids = _.without(layerIds, overlayIds);

                return _.filter(
                    layers,
                    function(layer) {
                        return (_.indexOf(ids, layer.id) != -1);
                    },
                    this
                );
            },

            /**
             * Closure around the layer that returns the ImageMapType for the
             * tile.
             */
            getTile: function(layer) {
                var name = layer.name,
                    type = layer.type,
                    self = this;
                if(layer.mode=='cdb') {
                    maptype = new mol.map.tiles.CartoDbTile(
                                layer,
                                layer.style_table,
                                this.map
                            );

                    maptype.layer.params.layer.onbeforeload = function (){
                        self.bus.fireEvent(
                            new mol.bus.Event(
                                "show-loading-indicator",
                                {source : layer.id}
                            )
                        )
                    };

                    maptype.layer.params.layer.onafterload = function (){
                        self.bus.fireEvent(
                            new mol.bus.Event(
                                "hide-loading-indicator",
                                {source : layer.id}
                            )
                        )
                    };
                } else {
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            "show-loading-indicator",
                            {source : layer.id}
                        )
                    );
                    $.getJSON(
                        'ee',
                        {
                            sciname: layer.name,
                            habitats: layer.selectedHabitats.join(','),
                            elevation: layer.selectedElev.join(','),
                            year: layer.selectedYear
                        },
                        function (ee) {
                            var maptype = new mol.map.tiles.EarthEngineTile(
                                ee,
                                layer,
                                self.map
                            );
                            maptype.layer.onafterload = function (){
                                self.bus.fireEvent(
                                    new mol.bus.Event(
                                        "hide-loading-indicator",
                                        {source : layer.id}
                                    )
                                )
                            };
                            maptype.layer.onbeforeload = function (){
                                self.bus.fireEvent(
                                    new mol.bus.Event(
                                        "show-loading-indicator",
                                        {source : layer.id}
                                    )
                                )
                            };

                            self.map.overlayMapTypes.insertAt(0,maptype.layer);
                        }
                    );
                };
            }
        }
     );

    mol.map.tiles.CartoDbTile = Class.extend(
        {
            init: function(layer, table, map) {
                var sql =  "" +
                    "SELECT cache_key.* FROM " +
                    " get_tile('{0}','{1}','{2}','{3}') cache_key".format(
                        layer.source,
                        layer.type,
                        layer.name,
                        layer.dataset_id
                    ),
                    hostname =  mol.services.cartodb.tileApi.host,
                    style_table_name = layer.style_table;
                    info_query = sql;
                    meta_query = "" +
                        "SELECT * FROM get_feature_metadata(TEXT('{0}'))",
                    infowindow = true,
                    hostname = (hostname === 'localhost') ?
                       '{0}:8080'.format(hostname) : hostname;

                if(layer.tile_style == undefined) {
                    layer.tile_style = "#" + layer.dataset_id + layer.css;
                    layer.style = layer.tile_style;
                    layer.orig_style = layer.tile_style;

                    layer.orig_opacity = layer.opacity;
                }

                this.layer = new google.maps.CartoDBLayer({
                        tile_name: layer.id,
                        tile_style: layer.tile_style,
                        hostname: hostname,
                        map_canvas: 'map_container',
                        map: map,
                        user_name: 'mol',
                        table_name: table,
                        mol_layer: layer,
                        style_table_name: layer.dataset_id,
                        query: sql,
                        info_query: info_query,
                        meta_query: meta_query,
                        map_style: false,
                        infowindow: infowindow,
                        opacity: layer.opacity
                });
            }
        }
    );
    mol.map.tiles.EarthEngineTile = Class.extend({
            init: function(ee, layer, map) {
                var eeMapOptions = {
                        getTileUrl: function(tile, zoom) {
                            var y = tile.y,
                                x = tile.x,
                                tileRange = 1 << zoom;
                            if (y < 0 || y >= tileRange) {
                                return null;
                            }
                            if (x < 0 || x >= tileRange) {
                                x = (x % tileRange + tileRange) % tileRange;
                            }

                            if (self.layer.pending.length === 1) {
                                $(self.layer).trigger("onbeforeload");
                            }

                            return ee.urlPattern.replace("{X}",x).replace("{Y}",y).replace("{Z}",zoom);
                        },
                        tileSize: new google.maps.Size(256, 256),
                        maxZoom: 9,
                        minZoom: 0
                },
                self = this;

                this.layer= new google.maps.ImageMapType(eeMapOptions);
                this.layer.baseGetTile = this.layer.getTile;

                this.layer.pending = [];
                //override getTile so we can add in an event when finished
                this.layer.getTile = function(tileCoord, zoom, ownerDocument) {

                    // Get the DOM node generated by the out-of-the-box ImageMapType
                    var node = self.layer.baseGetTile(tileCoord, zoom, ownerDocument);

                    // Listen for any images within the node to finish loading
                    $("img", node).one("load", function() {

                        // Remove the image from our list of pending urls
                        var index = $.inArray(this.__src__, self.layer.pending);
                        self.layer.pending.splice(index, 1);

                        // If the pending url list is empty, emit an event to
                        // indicate that the tiles are finished loading
                        if (self.layer.pending.length === 0) {
                            $(self.layer).trigger("onafterload");
                        }
                    });

                    return node;
                };

                this.layer.layer = layer;
                this.layer.name = layer.id;

            }
        }
    );
};

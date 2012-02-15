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
    mol.map.tiles.TileEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus, map) {
                this.proxy = proxy;
                this.bus = bus;
                this.map = map;
                this.addEventHandlers();
            },

            addEventHandlers: function() {
                var self = this;

                /**
                 * Handler for when the layer-toggle event is fired. This renders
                 * the layer on the map if visible, and removes it if not visible.
                 *  The event.layer is a layer object {id, name, type, source}. event.showing
                 * is true if visible, false otherwise.
                 */
                this.bus.addHandler(
                    'layer-toggle',
                    function(event) {
                        var showing = event.showing,
                            layer = event.layer;

                        if (showing) {
                            self.renderTiles([layer]);
                        } else { // Remove layer from map.
                            self.map.overlayMapTypes.forEach(
                                function(maptype, index) {
                                    if (maptype !=undefined && maptype.name === layer.id) {
                                        self.map.overlayMapTypes.removeAt(index);
                                    }
                                }
                            );
                        }
                    }
                );

                /**
                 * Handler for zoom to extent events. The event has a layer
                 * object {id, name, source, type}.
                 */
                this.bus.addHandler(
                    'layer-zoom-extent',
                    function(event) {
                        var layer = event.layer;
                        self.zoomToExtent(layer);
                    }
                );

                /**
                 * Hanlder for changing layer opacity. Note that this only works
                 * for polygon layers since point layers are rendered using image
                 * sprites for performance. The event.opacity is a number between
                 * 0 and 1.0 and the event.layer is an object {id, name, source, type}.
                 */
                this.bus.addHandler(
                    'layer-opacity',
                    function(event) {
                        var layer = event.layer,
                            opacity = event.opacity;

                        self.map.overlayMapTypes.forEach(
                            function(maptype, index) {
                                if (maptype.name === layer.id) {
                                    self.map.overlayMapTypes.removeAt(index);
                                    layer.opacity = opacity;
                                    self.renderTiles([layer]);
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
				* Handler for when the reorder-layers event is fired. This renders
				* the layers according to the list of layers provided
				*/
				this.bus.addHandler(
					'reorder-layers',
					function(event) {
						var layers = event.layers;
						_.each(
							layers,
							function(layerId) {
								self.map.overlayMapTypes.forEach(
									function(maptype, index) {
										if (maptype !=undefined && maptype.name === layerId) {
											self.map.overlayMapTypes.removeAt(index);
											self.map.overlayMapTypes.insertAt(0, maptype);
										}
									}
								)
							}
						)
					}
				);

            },

            /**
             * Renders an array a tile layers by firing add-map-overlays event
             * on the bus.
             *
             * @param layers the array of layer objects {name, type}
             */
            renderTiles: function(layers) {
                var tiles = [],
                    overlays = this.map.overlayMapTypes.getArray(),
                    newLayers = this.filterLayers(layers, overlays);

                _.each(
                    newLayers,
                    function(layer) {
                        tiles.push(this.getTile(layer, this.map));
                        this.bus.fireEvent(new mol.bus.Event("show-loading-indicator"));
                        $("img",this.map.overlayMapTypes).imagesLoaded(
                            function(images,proper,broken) {
                                this.bus.fireEvent(new mol.bus.Event("hide-loading-indicator"));
                            }.bind(this)
                         );
                    },
                    this
                );
            },
            /**
             * Returns an array of layer objects that are not already on the map.
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
             * Closure around the layer that returns the ImageMapType for the tile.
             */
            getTile: function(layer) {
                var name = layer.name,
                    type = layer.type,
                    tile = null;

                switch (type) {
                case 'points':
                    new mol.map.tiles.CartoDbTile(layer, 'points', this.map);
                    break;
                case 'polygon':
                case 'range':
                case 'expert opinion range map':
                    new mol.map.tiles.CartoDbTile(layer, 'polygons', this.map);
                    break;
                }
            },

            /**
             * Zooms and pans the map to the full extent of the layer. The layer is an
             * object {id, name, source, type}.
             */
	         zoomToExtent: function(layer) {
                var self = this,
                    sql = "SELECT ST_Extent(the_geom) FROM {0} WHERE scientificname='{1}'",
                    table = layer.type === 'points' ? 'points' : 'polygons',
                    query = sql.format(table, layer.name),
                    params = {
                        sql: query
                    },
                    action = new mol.services.Action('cartodb-sql-query', params),
                    success = function(action, response) {
                        var extent = response.rows[0].st_extent,
                            c = extent.replace('BOX(','').replace(')','').split(','),
                            coor1 = c[0].split(' '),
                            coor2 = c[1].split(' '),
                            sw = null,
                            ne = null,
                            bounds = null;

                        sw = new google.maps.LatLng(coor1[1],coor1[0]);
                        ne = new google.maps.LatLng(coor2[1],coor2[0]);
                        bounds = new google.maps.LatLngBounds(sw, ne);
		                  self.map.fitBounds(bounds);
		                  self.map.panToBounds(bounds);
		              },
		              failure = function(action, response) {
                        console.log('Error: {0}'.format(response));
                    };
                this.proxy.execute(action, new mol.services.Callback(success, failure));
		      }
        }
	 );

    mol.map.tiles.CartoDbTile = Class.extend(
        {
            init: function(layer, table, map) {
                var sql =  "SELECT * FROM {0} where scientificname = '{1}'",
                    opacity = layer.opacity && table !== 'points' ? layer.opacity : null,
                    tile_style = opacity ? "#{0}{polygon-fill:#99cc00;polygon-opacity:{1};}".format(table, opacity) : null;

                this.layer = new google.maps.CartoDBLayer(
                    {
                        tile_name: layer.id,
                        map_canvas: 'map_container',
                        map: map,
                        user_name: 'mol',
                        table_name: table,
                        query: sql.format(table, layer.name),
                        tile_style: tile_style,
                        map_style: true,
                        infowindow: true,
                        opacity: opacity
                    }
                );
            }
        }
    );
};

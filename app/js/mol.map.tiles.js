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
                this.layerCache = new  mol.map.tiles.LayerCache();
                this.addEventHandlers();
            },
            
            addEventHandlers: function() {
                var self = this;
             
                /**
                 * Handler for when the add-layers event is fired. This renders
                 * the layer on the map by firing a add-map-layer event. The 
                 * event.layer is a layer object {name:, type:}. event.showing
                 * is true if visible, false otherwise.
                 */
                this.bus.addHandler(
                    'layer-toggle',
                    function(event) {
                        if (event.showing) {
                            self.renderTiles([event.layer]);                            
                        }
                    }
                );
                
                /**
                 * Handler for when the layer-toggle event is fired. This renders
                 * the layers on the map by firing a add-map-layer event. The 
                 * event.layers is an array of layer objects {name:, type:}.
                 */
                this.bus.addHandler(
                    'add-layers',
                    function(event) {
                        self.renderTiles(event.layers);
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
                var tiles = [];
                
                _.each(
                    layers,
                    function(layer) {
                        tiles.push(this.getCartoDbTileLayer(layer, this.map));
                    },
                    this
                );
                
                this.cache.setMulti(tiles);
                //this.bus.fireEvent(new mol.bus.Event('add-map-overlays', {overlays: overlays}));
            },
            
            /**
             * Returns a CartoDBLayer.
             */
            getCartoDbTileLayer: function(layer, map) {
                var name = layer.name.trim(),
                    type = layer.type.trim(),
                    id = 'layer-{0}-{1}'.format(name, type);
                    
                return new google.maps.CartoDBLayer(
                    {
                        id: id,
                        tile_host: 'cartodb.com',
                        sql_host: 'cartodb.com',
                        map_canvas: 'map_canvas',
                        map: map,
                        user_name: 'eighty',
                        table_name: type,
                        query: "SELECT * FROM mol_cody where scientific = '{0}'".format(name),
                        map_style: true,
                        infowindow: true,
                        auto_bound: true
                    }
                );                        
            },
            
            /**
             * Closure around the layer that returns the ImageMapType for the tile.
             */
            getTile: function(layer) {
                var name = layer.name.trim(),
                    type = layer.type.trim(),
                    tile = null;

                switch (type) {
                case 'points':
                    tile = new mol.map.tiles.PointDensityTile(name, type);
                    break;
                case 'polygon':
                    tile = new mol.map.tiles.PolygonTile(name, type, this.map);
                    break;
                }
    
                return tile; //.getImageMapType();
            }
        }
    );    
    
    mol.map.tiles.TileCache = Class.extend(
        {
            init: function() {
                this.tiles = {};
            },
            
            set: function(tile) {
                this.tiles[tile.id] = tile;
            },
            
            get: function(name, type) {
                return this.tiles['layer-{0}-{1}'.format(name, type)];
            },
            
            setMulti: function(tiles) {
                _.each(tiles, this.set, this);
            }
        }
    );
    
    mol.map.tiles.PolygonTile = Class.extend(
        {            
            init: function(name, type, map) {
                this.id = 'layer-{0}-{1}'.format(name, type),
                this.layer = new google.maps.CartoDBLayer(
                    {
                        id: id,
                        tile_host: 'cartodb.com',
                        sql_host: 'cartodb.com',
                        map_canvas: 'map_canvas',
                        map: this.map,
                        user_name: 'eighty',
                        table_name: 'mol_cody',
                        query: "SELECT * FROM mol_cody where scientific = '{0}'".format(name),
                        map_style: true,
                        infowindow: true,
                        auto_bound: true
                    }
                );               
            }
        }        
    );
    
    mol.map.tiles.PointDensityTile = Class.extend(
        {
            /**
             * @name the scientific name used in the query
             */
            init: function(name, type) {
                this.name = name;
                this.id = 'layer-{0}-{1}'.format(name, type);
                this.name = name;
                this.statements = {};
                this.bottomZ = 4;
                this.topZ = null;
                this.style = null;
                this.createCalls(8);                
                //carto_map.overlayMapTypes.insertAt(0, cartodb_imagemaptype);
            },
            
            getImageMapType: function() {
                return new google.maps.ImageMapType(this.getTile());
            },
            
            getTile: function() {
                var self = this;
                
                return {
                    getTileUrl: function(coord, zoom) {
                        var statement;

                        if (zoom < self.bottomZ) {
                            statement = self.statements[0];
                        } 
                        else if (zoom >= self.topZ) {
                            statement = self.statements[self.topZ];
                        } 
                        else {
                            statement = self.statements[zoom];
                        }                        
                        return "http://layers.moldb.io:8181/tiles/eafr/" + zoom + "/" + coord.x + "/" + coord.y + ".png?" + statement;
                    },               
                    tileSize: new google.maps.Size(256, 256),
                    name: self.id
                };
            },
            
            createCalls: function(seed) {
                var z = this.bottomZ;
                this.topZ = this.bottomZ + 6;
                /* Define our base grid style */
                var baseStyle = "%23eafr{ polygon-fill:%23EFF3FF; polygon-opacity:0.6; line-opacity:1; line-color:%23FFFFFF;  ";
                /* Add grid colors based on count (cnt) in clusters */
                baseStyle += "[cnt>160]{ polygon-fill:%2308519C; polygon-opacity:0.7;} [cnt<160]{polygon-fill:%233182BD; polygon-opacity:0.65;} [cnt<80]{ polygon-fill:%236BAED6; polygon-opacity:0.6;} [cnt<40]{ polygon-fill:%239ECAE1; polygon-opacity:0.6;} [cnt<20]{polygon-fill:%23C6DBEF; polygon-opacity:0.6;} [cnt<2]{ polygon-fill:%23EFF3FF; polygon-opacity:0.4; }} ";
                
                /* Get the first level (lowest zoom) set of points clustered */
                var sql = "SELECT cnt, ST_Transform(ST_Envelope(GEOMETRYFROMTEXT('LINESTRING('||(st_xmax(the_geom)-" + (seed / 2) + ")||' '||(st_ymax(the_geom)-" + (seed / 2) + ")||', '||(st_xmax(the_geom)%2B" + (seed / 2) + ")||' '||(st_ymax(the_geom)%2B" + (seed / 2) + ")||')',4326)),3857) as the_geom_webmercator FROM (SELECT count(*) as cnt, scientificname, ST_SnapToGrid(the_geom, 0%2B" + (seed / 2) + ", 75%2B" + (seed / 2) + ", " + seed + ", " + seed + ") as the_geom FROM eafr GROUP By eafr.scientificname, ST_SnapToGrid(the_geom, 0%2B" + (seed / 2) + ", 75%2B" + (seed / 2) + ", " + seed + ", " + seed + ")) eafr WHERE eafr.scientificname='" + this.name + "' AND ST_Intersects(the_geom, GEOMETRYFROMTEXT('MULTIPOLYGON(((-180 75, -180 -75, 180 -75, 180 75, -180 75)))',4326))";
                seed = seed / 2;
                this.style = baseStyle;
                this.statements[0] = "sql=" + sql + "&style=" + this.style;
                /* Create a clustering SQL statement and a style for each zoom < topZ */
                while (z < this.topZ) {
                    sql = "SELECT cnt, scientificname, ST_Transform(ST_Envelope(GEOMETRYFROMTEXT('LINESTRING('||(st_xmax(the_geom)-" + (seed / 2) + ")||' '||(st_ymax(the_geom)-" + (seed / 2) + ")||', '||(st_xmax(the_geom)%2B" + (seed / 2) + ")||' '||(st_ymax(the_geom)%2B" + (seed / 2) + ")||')',4326)),3857) as the_geom_webmercator FROM (SELECT count(*) as cnt, scientificname, ST_SnapToGrid(the_geom, 0%2B" + (seed / 2) + ", 75%2B" + (seed / 2) + ", " + seed + ", " + seed + ") as the_geom FROM eafr GROUP By eafr.scientificname, ST_SnapToGrid(the_geom, 0%2B" + (seed / 2) + ", 75%2B" + (seed / 2) + ", " + seed + ", " + seed + ")) eafr WHERE eafr.scientificname='" + this.name + "' AND ST_Intersects(the_geom, GEOMETRYFROMTEXT('MULTIPOLYGON(((-180 75, -180 -75, 180 -75, 180 75, -180 75)))',4326))";
                    this.statements[z] = "sql=" + sql + "&style=" + this.style;
                    z++;
                    seed = seed / 2;
                }
                z = z - 1;
                /* Create a statement for all points and a style for those points at zoom>=10 */
                sql = "SELECT 1 as cnt, the_geom_webmercator FROM eafr WHERE scientificname = '" + this.name + "'";
                this.style = "%23eafr { marker-fill:%23E25B5B; marker-opacity:0.9; marker-width:5; marker-line-color:white; marker-line-width:1; marker-line-opacity:0.8; marker-placement:point;	marker-type:ellipse; marker-allow-overlap:true; } ";
                this.statements[this.topZ] = "sql=" + sql + "&style=" + this.style;
            }
        }
    );
};
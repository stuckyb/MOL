mol.modules.map.query = function(mol) {

    mol.map.query = {};

    mol.map.query.QueryEngine = mol.mvp.Engine.extend(
    {
        init : function(proxy, bus, map) {
                this.proxy = proxy;
                this.bus = bus;
                this.map = map;
                this.sql = "" +
                        "SET STATEMENT_TIMEOUT TO 0;" +
                        "SELECT DISTINCT scientificname " +
                        "FROM polygons_new " +
                        "WHERE ST_DWithin(the_geom_webmercator,ST_Transform(ST_PointFromText('POINT({0})',4326),3857),{1}) " +
                        //"WHERE ST_DWithin(the_geom,ST_PointFromText('POINT({0})',4326),0.1) " +
                        "AND provider = 'birds1000m'";

        },
        start : function() {
            this.addQueryDisplay();
            this.addEventHandlers();
        },
        /*
         *  Build the loading display and add it as a control to the top center of the map display.
         */
        addQueryDisplay : function() {
                 var params = {
                   display: null, // The loader gif display
                   slot: mol.map.ControlDisplay.Slot.BOTTOM,
                   position: google.maps.ControlPosition.BOTTOM_LEFT
                };
                this.display = new mol.map.QueryDisplay();
                params.display = this.display;
                event = new mol.bus.Event('add-map-control', params);
                this.bus.fireEvent(event);
        },
        changeTool: function(mode) {
                    var params = {toggle : false},
                        mapevent, searchevent, layerevent;
                    switch(mode) {
                        case 'list':
                            params.toggle = false;
                            this.enableListTool();
                        break;
                        case 'info':
                            params.toggle = true;
                        break;
                        default:
                            params.toggle = true;

                    }
        },
        enableListTool: function() {
                var event = new mol.bus.Event('register-list-click');
                this.bus.fireEvent(event);


        },
        getList: function(lat, lng, radius, marker) {
                var self = this,
                    sql = this.sql.format((lat+' '+lng), radius),
                    params = {sql:sql, key: '{0}'.format((lat+'-'+lng+'-'+radius))},
                    action = new mol.services.Action('cartodb-sql-query', params),
                    success = function(action, response) {
                        var results = {marker:marker, response:response},
                        event = new mol.bus.Event('species-list-query-results', results);
                        self.bus.fireEvent(event);
                    },
                    failure = function(action, response) {

                    };
                this.proxy.execute(action, new mol.services.Callback(success, failure));

        },
        addEventHandlers : function () {
            var self = this;
            /*
             * Handler in case other modules want to switch the query tool
             */
            this.bus.addHandler(
                'query-type-toggle',
                function (params) {
                    var e = {
                        params : params
                    }
                    self.changeTool(e);
                }
            );
            this.bus.addHandler(
                'species-list-query-click',
                function (event) {
                    if(self.listradius) {
                        self.listradius.setMap(null);
                    }
                    self.listradius =  new google.maps.Circle({
                        map: event.map,
                        radius: 50000, // 50 km
                        center: event.gmaps_event.latLng
                    });
                    //listradius.bindTo('center', listmarker, 'position');
                    $(self.resultsdisplay).empty();
                    self.bus.fireEvent( new mol.bus.Event('layer-display-toggle'),{visible : false});
                    self.getList(event.gmaps_event.latLng.lat(),event.gmaps_event.latLng.lng(),self.listradius.radius, self.listradius);
                }
            );
             this.bus.addHandler(
                'species-list-query-results',
                function (event) {
                    var liststr,
                        params = {
                                display: null,
                                slot: mol.map.ControlDisplay.Slot.BOTTOM,
                                position: google.maps.ControlPosition.TOP_RIGHT
                        };
                    if(!event.response.error) {
                           self.resultsdisplay = new mol.map.QueryResultsDisplay(event.response.rows);
                           params.display = self.resultsdisplay;
                           event = new mol.bus.Event('add-map-control', params);
                           self.bus.fireEvent(event);
                    }
                }
             );

            this.display.speciesListButton.click(
                function(event) {
                    self.changeTool('list')
                }
            );
            this.display.speciesInfoButton.click(
                function(event) {
                    self.changeTool('info')
                }
            );
        }
    }
    );

    /*
     *  Display for a loading indicator.
     *  Use jQuery hide() and show() to turn it off and on.
     */
    mol.map.QueryDisplay = mol.mvp.View.extend(
    {
        init : function() {
            var className = 'mol-Map-QueryDisplay',
                html = '' +
                        '<div class="' + className + ' widgetTheme">' +
                        '   <div><input type="radio" class="list" name="queryclicktype" value="list">Species List Query Tool (50km)</div>' +
                        '   <div><input type="radio" class="info" name="queryclicktype" value="info" checked>Species Distribution Maps</div>' +
                        '</div>';
            this._super(html);
            this.speciesListButton = $(this).find('.list');
            this.speciesInfoButton = $(this).find('.info');

        }
    }
    );
     /*
     *  Display for a loading indicator.
     *  Use jQuery hide() and show() to turn it off and on.
     */
    mol.map.QueryResultsDisplay = mol.mvp.View.extend(
    {
        init : function(names) {
            var className = 'mol-Map-QueryDisplay',
                html = '' +
                        '<div class="' + className + ' widgetTheme">' +
                        '</div>',
                result_html = '' +
                        '<div class="list_query_results">{0}</div>';

            this._super(html);

            _.each(
                names,
                function(name) {
                    this.element.innerHTML+=result_html.format(name.scientificname);
                }.bind(this)
            )
        }
    }
    );
}

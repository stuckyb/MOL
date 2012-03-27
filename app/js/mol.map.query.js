mol.modules.map.query = function(mol) {

    mol.map.query = {};

    mol.map.query.QueryEngine = mol.mvp.Engine.extend(
    {
        init : function(proxy, bus, map) {
                this.proxy = proxy;
                this.bus = bus;
                this.map = map;
                this.sql = "" +
                        "SELECT DISTINCT p.scientificname as scientificname, t.common_names_eng as english, t._order as order, t.Family as family, t.red_list_status as redlist, CASE WHEN t.class is not null THEN CONCAT('The ', initcap(t.class), ' class was assessed in ', t.year_assessed, '. ') ELSE '' END as year_assessed " +
                        "FROM polygons p LEFT JOIN master_taxonomy t ON p.scientificname = t.scientific " +
                        "WHERE ST_DWithin(p.the_geom_webmercator,ST_Transform(ST_PointFromText('POINT({0})',4326),3857),{1}) " +
                        //"WHERE ST_DWithin(the_geom,ST_PointFromText('POINT({0})',4326),0.1) " +
                        " {2} ORDER BY \"order\", scientificname";

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
                    display: null,
                    slot: mol.map.ControlDisplay.Slot.BOTTOM,
                    position: google.maps.ControlPosition.RIGHT_BOTTOM
                 };
                this.bus.fireEvent(new mol.bus.Event('register-list-click'));
                this.enabled=true;
                this.features={};
                this.display = new mol.map.QueryDisplay();
                params.display = this.display;
                this.bus.fireEvent( new mol.bus.Event('add-map-control', params));
        },
        getList: function(lat, lng, listradius, constraints, className, typeName) {
                var self = this,
                    sql = this.sql.format((lng+' '+lat), listradius.radius, constraints),
                    params = {sql:sql, key: '{0}'.format((lat+'-'+lng+'-'+listradius.radius+constraints))},
                    action = new mol.services.Action('cartodb-sql-query', params),
                    success = function(action, response) {
                        var results = {listradius:listradius, className : className, typeName : typeName, constraints: constraints, response:response},
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
                    };
                    self.changeTool(e);
                }
            );
            this.bus.addHandler(
                'species-list-query-click',
                function (event) {
                    var listradius,
                        constraints = $(self.display.classInput).val() + $(self.display.typeInput).val(),
                        className =  $("option:selected", $(self.display.classInput)).text(),
                        typeName = $("option:selected", $(self.display.typeInput)).text();

                    if (self.enabled) {
                        listradius = new google.maps.Circle(
                            {
                                map: event.map,
                                radius: parseInt(self.display.radiusInput.val())*1000, // 50 km
                                center: event.gmaps_event.latLng,
                                strokeWeight: 0,
                                clickable:false
                            }
                        );
                        self.bus.fireEvent( new mol.bus.Event('show-loading-indicator', {source : 'listradius'}));
                        self.getList(event.gmaps_event.latLng.lat(),event.gmaps_event.latLng.lng(),listradius, constraints, className, typeName);
                    }
                 }
            );
             this.bus.addHandler(
                'species-list-query-results',
                function (event) {
                    var content,
                        contentHeader,
                        listradius  = event.listradius,
                        className,
                        typeName,
                        typeStr,
                        content,
                        scientificnames = [],
                        infoWindow,
                        latHem,
                        lngHem,
                        redlistCt = {},
                        yearassessed = {},
                        speciesthreatened = 0,
                        speciesdd = 0,
                        infoDiv;

                    if(!event.response.error) {
                            className = event.className.toLowerCase(),
                            typeName = event.typeName,
                            typeStr = '';

                        typeStr = ' with ' + typeName.replace(/maps/i, '').toLowerCase() + ' maps ';
                        latHem = (listradius.center.lat() > 0) ? 'North' : 'South';
                        lngHem = (listradius.center.lng() > 0) ? 'East' : 'West';

                        contentHeader='<div class="mol-Map-ListQueryInfoWindow">' +
                                '   <div> ' +
                                event.response.total_rows +
                                '       ' +
                                className +
                                '       species ' +
                                typeStr +
                                '       found within ' +
                                listradius.radius/1000 + ' km of ' +
                                Math.abs(Math.round(listradius.center.lat()*1000)/1000) + '&deg;&nbsp;' + latHem + '&nbsp;' +
                                Math.abs(Math.round(listradius.center.lng()*1000)/1000) + '&deg;&nbsp;' + lngHem + '<br>';

                        content = '   </div>'+
                                '   <div>' +
                                '       <table class="tablesorter">' +
                                '           <thead><tr><th>Scientific Name</th><th>English Name</th><th>Order</th><th>Family</th><th>Red List Status</th></tr></thead><tbody>';
                        _.each(
                            event.response.rows,
                            function(name) {
                                 content += "<tr><td class='scientificname' >" +
                                    name.scientificname + "</td><td>" +
                                    name.english + "</td><td>" +
                                    name.order + "</td><td>" +
                                    name.family + "</td><td>" +
                                    name.redlist + "</td></tr>";

                                 speciesthreatened += (name.redlist == 'RN' || name.redlist == 'VU' || name.redlist == 'CR' )  ? 1 : 0;
                                 speciesdd += (name.redlist == 'DD')  ? 1 : 0;
                                 yearassessed[name.year_assessed] = name.year_assessed;
                            }
                        );
                        content += '        <tbody>' +
                                   '    </table></div>' +
                                   '</div>';

                        stats = (speciesthreatened > 0) ? (speciesthreatened+" species are threatened (IUCN Red List codes RN, VU, or CR).<br>") : "";
                        stats += (speciesdd > 0) ? (speciesdd+" species are data deficient (IUCN Red LIst code DD).<br>") : "";
                        _.each(
                            yearassessed,
                            function(yearstr) {
                                stats+=yearstr + '<br>';
                            }
                        )
                        infoWindow= new google.maps.InfoWindow( {
                            content: $(contentHeader+stats+content)[0],
                            position: listradius.center
                        });

                        self.features[listradius.center.toString()+listradius.radius] = {
                             listradius : listradius,
                             infoWindow : infoWindow
                        };

                        google.maps.event.addListener(
                            infoWindow,
                            "closeclick",
                            function (event) {
                                listradius.setMap(null);
                                delete(self.features[listradius.center.toString()+listradius.radius]);
                            }
                         );
                         self.features[listradius.center.toString()+listradius.radius] = {
                             listradius : listradius,
                             infoWindow : infoWindow
                         };

                        infoWindow.open(self.map);
                        $(".tablesorter", $(infoWindow.content)
                         ).tablesorter({widthFixed: true}
                         );

                         _each(
                             $('.scientificname',$(infoWindow.content)),
                             function(cell) {
                                 cell.click = function(event) {
                                     self.bus.fireEvent('search', new mol.bus.Event('search',cell.innerText));
                                 }
                             }
                         );
                        } else {
                            listradius.setMap(null);
                            delete(self.features[listradius.center.toString()+listradius.radius]);
                        }

                    self.bus.fireEvent( new mol.bus.Event('hide-loading-indicator', {source : 'listradius'}));

                }
             );

            this.bus.addHandler(
                'species-list-tool-toggle',
                function(event) {
                    self.enabled = !self.enabled;
                    if (self.listradius) {
                            self.listradius.setMap(null);
                        }
                    if(self.enabled == true) {
                        $(self.display).show();
                        _.each(
                            self.features,
                            function(feature) {
                                feature.listradius.setMap(self.map);
                                feature.infoWindow.setMap(self.map);
                            }
                        );
                    } else {
                        $(self.display).hide();
                        _.each(
                            self.features,
                            function(feature) {
                                feature.listradius.setMap(null);
                                feature.infoWindow.setMap(null);
                            }
                        );
                   }
                }
            );
            this.display.radiusInput.blur(
                function(event) {
                    if(this.value>1000) {
                        this.value=1000;
                        alert('Please choose a radius between 50 km and 1000 km.');
                    }
                    if(this.value<50) {
                        this.value=50;
                        alert('Please choose a radius between 50 km and 1000 km.');
                    }
                }
            );
        }
    }
    );

    mol.map.QueryDisplay = mol.mvp.View.extend(
    {
        init : function(names) {
            var className = 'mol-Map-QueryDisplay',
                html = '' +
                        '<div class="' + className + ' widgetTheme">' +
                        '   <div class="controls">' +
                        '     Search Radius <select class="radius">' +
                        '       <option selected value="50">50 km</option>' +
                        '       <option value="100">100 km</option>' +
                        '       <option value="500">500 km</option>' +
                        '       <option value="1000">1000 km</option>' +
                        '     </select>' +
                        '     Class <select class="class" value="">' +
                        '       <option value="">All</option>' +
                        '       <option selected value=" and p.class=\'aves\'">Bird</option>' +
                        '       <option value=" and p.class=\' osteichthyes\'">Fish</option>' + //note the space, leaving till we can clean up polygons
                        '       <option value=" and p.class=\'reptilia\'">Reptile</option>' +
                        '       <option value=" and p.class=\'amphibia\'">Amphibian</option>' +
                        '       <option value=" and p.class=\'mammalia\'">Mammal</option>' +
                        '     </select>' +
                        '     Type <select class="type" value="">' +
                        '       <option value="">All</option>' +
                        '       <option selected value="and p.type=\'range\' ">Range maps</option>' +
                        '       <option value=" and p.type=\'protectedarea\'">Protected Areas</option>' +
                        '       <option value=" and p.type=\'ecoregion\'">Ecoregions</option>' +
                        '       <option value=" and p.type=\'point\'">Point records</option>' +
                        '     </select>' +
                        '   </div>' +
                        //'   <div class="resultslist">Click on the map to find bird species within 50km of that point.</div>' +
                        '</div>';

            this._super(html);
            this.resultslist=$(this).find('.resultslist');
            this.radiusInput=$(this).find('.radius');
            //$(this.radiusInput).numeric({negative : false, decimal : false});
            this.classInput=$(this).find('.class');
            this.typeInput=$(this).find('.type');
        }
    }
    );
    mol.map.QueryResultDisplay = mol.mvp.View.extend(
    {
        init : function(scientificname) {
            var className = 'mol-Map-QueryResultDisplay',
                 html = '{0}';
            this._super(html.format(scientificname));

        }
    }
    );
};
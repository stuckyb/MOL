mol.modules.map.query = function(mol) {

    mol.map.query = {};

    mol.map.query.QueryEngine = mol.mvp.Engine.extend(
    {
        init : function(proxy, bus, map) {
                this.proxy = proxy;
                this.bus = bus;
                this.map = map;
                this.sql = "" +
                        "SELECT DISTINCT "+
                        "   p.scientificname as scientificname, "+
                        "   t.common_names_eng as english, "+
                        "   initcap(lower(t._order)) as order, " +
                        "   initcap(lower(t.Family)) as family, " +
                        "   t.red_list_status as redlist, " +
                        "   initcap(lower(t.class)) as className, " +
                        "   p.type as type, " +
                        "   p.provider as provider, " +
                        "   t.year_assessed as year_assessed " +
                        "FROM {3} p " +
                        "LEFT JOIN (SELECT scientific, " +
                        "                  string_agg(common_names_eng, ',')  as common_names_eng, " + //using string_agg in case there are duplicates
                        "                  MIN(class) as class, " + //these should be the same, even if there are duplicates
                        "                  MIN(_order) as _order, " +
                        "                  MIN(family) as family, " +
                        "                  string_agg(red_list_status,',') as red_list_status, " +
                        "                  string_agg(year_assessed,',') as year_assessed " +
                        "           FROM master_taxonomy WHERE " +
                        "                  infraspecific_name = '' " + //dont want subspecies
                        "           GROUP BY scientific ) t " +
                        "ON p.scientificname = t.scientific " +
                        "WHERE " +
                        "   ST_DWithin(p.the_geom_webmercator,ST_Transform(ST_PointFromText('POINT({0})',4326),3857),{1}) " + //radius test
                        "   {2} " + //other constraints
                        "ORDER BY \"order\", scientificname";

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
                    sql = this.sql.format((lng+' '+lat), listradius.radius, constraints, (typeName == 'Point records') ? 'gbif_import' : 'polygons'),
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
                        listradius  = event.listradius,
                        className,
                        typeName,
                        typeStr,
                        tablerows = [],
                        providers = [],
                        scientificnames = {},
                        years = [],
                        infoWindow,
                        latHem,
                        lngHem,
                        height,
                        redlistCt = {},
                        speciestotal = 0,
                        speciesthreatened = 0,
                        speciesdd = 0;

                    if(!event.response.error) {
                            className = event.className,
                            typeName = event.typeName,
                            typeStr = '';

                        typeStr = typeName.replace(/maps/i, '').toLowerCase() + ' maps ';
                        latHem = (listradius.center.lat() > 0) ? 'N' : 'S';
                        lngHem = (listradius.center.lng() > 0) ? 'E' : 'W';



                        _.each(
                           event.response.rows,
                            function(row) {
                                    var english = (row.english != null) ? _.uniq(row.english.split(',')).join(',') : '',
                                        year = (row.year_assessed != null) ? _.uniq(row.year_assessed.split(',')).join(',') : '',
                                        redlist = (row.redlist != null) ? _.uniq(row.redlist.split(',')).join(',') : '';

                                    tablerows.push("<tr><td><button value='"+row.scientificname+"'>map</button></td>" +
                                        "<td class='wiki'>" +
                                        row.scientificname + "</td><td class='wiki english'>" +
                                        english + "</td><td class='wiki'>" +
                                        row.order + "</td><td class='wiki'>" +
                                        row.family + "</td><td class='iucn' data-scientificname='"+row.scientificname+"'>" +
                                        row.redlist + "</td></tr>");
                                    providers.push(row.type.charAt(0).toUpperCase()+row.type.substr(1,row.type.length) + ' maps/' + row.provider);
                                    if (year != null && year != '') {
                                        years.push(year)
                                    }
                                    scientificnames[row.scientificname]=redlist;
                            }
                        );

                        tablerows = _.uniq(tablerows);
                        providers = _.uniq(providers);

                        years = _.sortBy(_.uniq(years), function(val) {return val});
                        years[years.length-1] = (years.length > 1) ? ' and '+years[years.length-1] : years[years.length-1];

                        _.each(
                            scientificnames,
                            function(red_list_status) {
                                speciestotal++;
                                speciesthreatened += ((red_list_status.indexOf('RN')>=0) || (red_list_status.indexOf('VU')>=0) || (red_list_status.indexOf('CR')>=0) )  ? 1 : 0;
                                speciesdd += (red_list_status.indexOf('DD')>0)  ? 1 : 0;
                            }
                        )

                        height = (90 + 22*speciestotal < 450) ? 90 + 22*speciestotal : 450;

                        stats = (speciesthreatened > 0) ? ('('+speciesthreatened+' considered threatened by <a href="http://www.iucnredlist.org" target="_iucn">IUCN</a> '+years.join(',')+')') : '';

                        if(speciestotal>0) {
                            content=$('<div class="mol-Map-ListQueryInfoWindow" style="height:'+ height+'px">' +
                                    '   <div>' +
                                    '       <b>' +
                                            className + ' species ' +
                                    '       </b>' +
                                            listradius.radius/1000 + ' km around ' +
                                            Math.abs(Math.round(listradius.center.lat()*1000)/1000) + '&deg;&nbsp;' + latHem + '&nbsp;' +
                                            Math.abs(Math.round(listradius.center.lng()*1000)/1000) + '&deg;&nbsp;' + lngHem + ':<br>' +
                                            speciestotal + ' '+
                                            stats +
                                           '<br>' +
                                           'Data type/source:&nbsp;' + providers.join(', ') +
                                    '   </div> ' +
                                    '   <div> ' +
                                    '       <table class="tablesorter">' +
                                    '           <thead><tr><th></th><th>Scientific Name</th><th>English Name</th><th>Order</th><th>Family</th><th>IUCN&nbsp;&nbsp;</th></tr></thead>' +
                                    '           <tbody>' +
                                                    tablerows.join('') +
                                    '           </tbody>' +
                                    '       </table>' +
                                    '   </div>' +
                                    '</div>');
                        } else {
                            content = $('<div class="mol-Map-ListQueryEmptyInfoWindow">' +
                                    '       <b>' +
                                    '        No ' + className.replace(/All/g, '') + ' species found within ' +
                                            listradius.radius/1000 + ' km of ' +
                                            Math.abs(Math.round(listradius.center.lat()*1000)/1000) + '&deg;&nbsp;' + latHem + '&nbsp;' +
                                            Math.abs(Math.round(listradius.center.lng()*1000)/1000) + '&deg;&nbsp;' + lngHem +
                                    '       </b>' +
                                    '   </div>');
                        }

                        infoWindow= new google.maps.InfoWindow( {
                            content: content[0],
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
                        //infoWindow.setSize(new google.maps.Size(height+200), 650)
                        $(".tablesorter", $(infoWindow.content)
                         ).tablesorter({ headers: { 0: { sorter: false}}, widthFixed: true}
                         );

                         _.each(
                             $('button',$(infoWindow.content)),
                             function(button) {
                                 $(button).click(
                                     function(event) {
                                        self.bus.fireEvent(new mol.bus.Event('search',{term:$(button).val()}));
                                    }
                                 );
                             }
                         );
                         _.each(
                             $('.wiki',$(infoWindow.content)),
                             function(wiki) {
                                 $(wiki).click(
                                     function(event) {
                                        var win = window.open('http://en.wikipedia.com/wiki/'+$(this).text().split(',')[0].replace(/ /g, '_'));
                                        win.focus();
                                    }
                                 );
                             }
                         );
                         _.each(
                             $('.iucn',$(infoWindow.content)),
                             function(iucn) {
                                 $(iucn).click(
                                     function(event) {
                                        var win = window.open('http://www.iucnredlist.org/apps/redlist/search/external?text='+$(this).data('scientificname'));
                                        win.focus();
                                    }
                                 );
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
                        '       <option selected value=" and p.class=\'aves\' ">Bird</option>' +
                        '       <option value=" and p.class LIKE \'%osteichthyes\' ">Fish</option>' + //note the space, leaving till we can clean up polygons
                        '       <option value=" and p.class=\'reptilia\' ">Reptile</option>' +
                        '       <option value=" and p.class=\'amphibia\' ">Amphibian</option>' +
                        '       <option value=" and p.class=\'mammalia\' ">Mammal</option>' +
                        '     </select>' +
                        '     Type <select class="type" value="">' +
                        '       <option value="">All</option>' +
                        '       <option selected value="and p.type=\'range\' ">Range maps</option>' +
                        '       <option value=" and p.type=\'protectedarea\'">Protected Areas</option>' +
                        '       <option value=" and p.type=\'ecoregion\'">Ecoregions</option>' +
                        '       <option disabled value="">Point records</option>' +
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
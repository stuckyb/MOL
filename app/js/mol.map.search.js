mol.modules.map.search = function(mol) {

    mol.map.search = {};

    mol.map.search.SearchEngine = mol.mvp.Engine.extend(
        {
            /**
             * @param bus mol.bus.Bus
             */
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
                this.searching = {};
                this.names = [];
                this.sql = '' +
                    'SELECT DISTINCT ' +
                    '	 l.scientificname as name, '+ //shapefile/data source name
                    '    l.type as type, '+
                    '    t.title as type_title, '+
                    '    l.provider as source, '+
                    '    p.title as source_title, '+
                    '    n.class as _class, ' +
                    '    s.mol_scientificname as mol_scientificname, ' + // mol taxonomy name
                    '    l.feature_count as feature_count, '+
                    '    n.common_names_eng as names,' +
                    '    CONCAT(\'{sw:{lng:\',ST_XMin(l.extent),\', lat:\',ST_YMin(l.extent),\'} , ne:{lng:\',ST_XMax(l.extent),\', lat:\',ST_YMax(l.extent),\'}}\') as extent ' +
                    "FROM (SELECT n FROM ac where not is_syn and n~*'\\m{0}' OR v~*'\\m{0}' or s~*'\\m{0}' ) ac " + //start with valid sci names
                    'LEFT JOIN synonyms ON ' + //add synonyms
                    '    ac.n = s.mol_scientificname ' +
                    'LEFT JOIN layer_metadata l ON ' + //add layers that match
                    '	 s.scientificname = l.scientificname OR ac.n = l.scientificname ' +
                    'LEFT JOIN types t ON ' + //add type metadata
                    '    l.type = t.type ' +
                    'LEFT JOIN providers p ON ' + //add provider metadata
                    '    l.provider = p.provider ' +
                    'LEFT JOIN taxonomy n ON ' + //add taxonomy metadata
                    '    l.scientificname = n.scientificname OR s.mol_scientificname = n.scientificname ' +
                    'ORDER BY l.scientificname, l.provider, l.type';
            },

            /**
             * Starts the SearchEngine.
             */
            start: function() {
                this.display = new mol.map.search.SearchDisplay();
                this.display.toggle(true);
                this.initAutocomplete();
                this.addEventHandlers();
                this.fireEvents();
            },
            /*
             * Initialize autocomplate functionality
             */
            initAutocomplete: function() {
                this.populateAutocomplete(null, null);

                // http://stackoverflow.com/questions/2435964/jqueryui-how-can-i-custom-format-the-autocomplete-plug-in-results
                $.ui.autocomplete.prototype._renderItem = function (ul, item) {

                    item.label = item.label.replace(
                        new RegExp("(?![^&;]+;)(?!<[^<>]*)(" +
                                   $.ui.autocomplete.escapeRegex(this.term) +
                                   ")(?![^<>]*>)(?![^&;]+;)", "gi"), "<strong>$1</strong>");
                    return $("<li></li>")
                        .data("item.autocomplete", item)
                        .append("<a>" + item.label + "</a>")
                        .appendTo(ul);
                };
            },

            /*
             * Populate autocomplete results list
             */
            populateAutocomplete : function(action, response) {
				var self = this;
                $(this.display.searchBox).autocomplete(
                    {
                        minLength: 3, // Note: Auto-complete indexes are min length 3.
                        source: function(request, response) {
                            $.post(
                                'cache/get',//http://dtredc0xh764j.cloudfront.net/api/v2/sql',
                                {
                                    key: 'ac080212333-{0}'.format(request.term),
                                    sql:"SELECT DISTINCT n,v,s  from ac where not is_syn and n~*'\\m{0}' OR v~*'\\m{0}' or s~*'\\m{0}'".format(request.term)
                                },
                                function (json) {
                                    var names = [],scinames=[];
                                    _.each (
                                        json.rows,
                                        function(row) {
                                            var sci, eng, syn;
                                            if(row.n != undefined){
                                                   sci = row.n;
                                                   syn = (row.s == null) ? '' : ',&nbsp;synonym{0}: {1}'.format((row.s.indexOf(',')>0) ? 's' : '', row.s);
                                                   eng = (row.v == null || row.v == '') ? '' : ', {0}'.format(row.v.replace(/'S/g, "'s"));
                                                   names.push({label:'<div class="ac-item"><span class="sci">{0}</span><span class="sci">{1}</span><span class="eng">{2}</span></div>'.format(sci, syn, eng), value: sci});
                                                   scinames.push(sci)

                                           }
                                       }
                                    );
                                    if(scinames.length>0) {
                                        self.names=scinames;
                                    }
                                    response(names);
                                    self.bus.fireEvent(new mol.bus.Event('hide-loading-indicator', {source : "autocomplete"}));
                                 },
                                 'json'
                            );
                        },
                        select: function(event, ui) {
                            self.searching[ui.item.value] = false;
                            self.names = [ui.item.value];
                            self.search(ui.item.value);
                        },
                        close: function(event,ui) {

                        },
                        search: function(event, ui) {
                            self.searching[$(this).val()] = true;
                            self.names=[];
                            self.bus.fireEvent(new mol.bus.Event('show-loading-indicator', {source : "autocomplete"}));
                        },
                        open: function(event, ui) {
                            self.searching[$(this).val()] = false;
                            self.bus.fireEvent(new mol.bus.Event('hide-loading-indicator', {source : "autocomplete"}));
                        }
                  });
            },

            addEventHandlers: function() {
                var self = this;

                /**
                 * Callback that toggles the search display visibility. The
                 * event is expected to have the following properties:
                 *
                 *   event.visible - true to show the display, false to hide it.
                 *
                 * @param event mol.bus.Event
                 */
                this.bus.addHandler(
                    'search-display-toggle',
                    function(event) {
                        var params = {},
                            e = null;

                        if (event.visible === undefined) {
                            self.display.toggle();
                            params = {visible: self.display.is(':visible')};
                        } else {
                            self.display.toggle(event.visible);
                        }

                        e = new mol.bus.Event('results-display-toggle', params);
                        self.bus.fireEvent(e);
                    }
                );

                this.bus.addHandler(
                    'close-autocomplete',
                    function(event) {
                        $(self.display.searchBox).autocomplete("close");
                    }
                );

                this.bus.addHandler(
                    'search',
                    function(event) {
                        if (event.term != undefined) {
                            if (!self.display.is(':visible')) {
                                self.bus.fireEvent(new mol.bus.Event('search-display-toggle',{visible : true}));
                            }

                            self.search(event.term);

                            if (self.display.searchBox.val()=='') {
                                self.display.searchBox.val(event.term);
                            }
                        }
                   }
                );

                /**
                 * Clicking the go button executes a search.
                 */
                this.display.goButton.click(
                    function(event) {
						      self.search(self.display.searchBox.val());
                    }
                );

                /**
                 * Clicking the cancel button hides the search display and fires
                 * a cancel-search event on the bus.
                 */
                this.display.cancelButton.click(
                    function(event) {
                        var params = {
                            visible: false
                        };

                        self.display.toggle(false);
                        self.bus.fireEvent(
                            new mol.bus.Event('results-display-toggle', params));
                    }
                );

                /**
                 * Pressing the return button clicks the go button.
                 */
                this.display.searchBox.keyup(
                    function(event) {
                        if (event.keyCode === 13) {
                            $(this).autocomplete("close");
                            self.bus.fireEvent(new mol.bus.Event('hide-loading-indicator', {source : "autocomplete"}));
                            self.search($(this).val());
                        }
                    }
                );
            },

            /**
             * Fires the 'add-map-control' event. The mol.map.MapEngine handles
             * this event and adds the display to the map.
             */
            fireEvents: function() {
                var params = {
                        display: this.display,
                        slot: mol.map.ControlDisplay.Slot.TOP,
                        position: google.maps.ControlPosition.TOP_LEFT
                    },
                    event = new mol.bus.Event('add-map-control', params);

                this.bus.fireEvent(event);
            },

            /**
             * Searches CartoDB via proxy using a term from the search box. Fires
             * a search event on the bus. The success callback fires a search-results
             * event on the bus.
             *
             * @param term the search term (scientific name)
             */
            search: function(term) {
                var self = this;
                    self.bus.fireEvent(new mol.bus.Event('show-loading-indicator', {source : "search-{0}".format(term)}));
                    self.bus.fireEvent(new mol.bus.Event('results-display-toggle',{visible : false}));
                    $(self.display.searchBox).autocomplete('disable');
                    $(self.display.searchBox).autocomplete('enable');
                    if(term.length<3) {
                        alert('Please enter at least 3 characters in the search box.');
                    } else {
                        $(self.display.searchBox).val(term);
                        $.post(
                                'cache/get',
                                {
                                    key:'search-{0}-{1}'.format(term, Math.random()),
                                    sql:this.sql.format(term)
                                },
                                function (response) {
                                    var results = {term:term, response:response};
                                    self.bus.fireEvent(new mol.bus.Event('hide-loading-indicator', {source : "search-{0}".format(term)}));
                                    self.bus.fireEvent(new mol.bus.Event('search-results', results));
                                },
                                'json'
                        );
                   }

            }
        }
    );

    mol.map.search.SearchDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-LayerControl-Search widgetTheme">' +
                    '    <div class="title ui-autocomplete-input">Search:</div>' +
                    '    <input class="value" type="text" placeholder="Search by species name">' +
                    '    <button class="execute">Go</button>' +
                    '    <button class="cancel">&nbsp;</button>' +
                    '</div>';

                this._super(html);
                this.goButton = $(this).find('.execute');
                this.cancelButton = $(this).find('.cancel');
                this.searchBox = $(this).find('.value');
            },

            clear: function() {
                this.searchBox.html('');
            }
        }
    );
};

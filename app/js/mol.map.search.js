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
                this.sql = '' +
                    'SELECT ' +
                    'provider as source, scientificname as name, type as type, englishname ' +
                    'FROM scientificnames s ' +
                    'LEFT JOIN (' +
                    '   SELECT ' +
                    '   scientific, initcap(lower(array_to_string(array_sort(array_agg(common_names_eng)),\', \'))) as englishname ' +
                    '   FROM master_taxonomy ' +
                    '   GROUP BY scientific ' +
                    ') n '+
                    'ON s.scientificname = n.scientific ' +
                    'WHERE scientificname = \'{0}\'';
            },

            /**
             * Starts the SearchEngine. Note that the container parameter is
             * ignored.
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
                    var val = item.label.split(':'),
                        name = val[0],
                        kind = val[1],
                        eng = '<a>{0}</a>'.format(name),
                        sci = '<a><i>{0}</i></a>'.format(name);

                    item.label = kind === 'sci' ? sci : eng;
                    item.value = name;
                    if(kind == 'sci') {
                        item.type = 'scientificname';
                    } else {
                        item.type =  'vernacularname';
                    }

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
                $(this.display.searchBox).autocomplete(
                    {
                        minLength: 3, // Note: Auto-complete indexes are min length 3.
                        delay: 0,
                        source: function(request, response) {
                            $.getJSON(
                                'api/autocomplete',
                                {
                                    key: 'acn-{0}'.format(request.term)
                                },
                                function(names) {
                                    response(
                                        _.sortBy(names,  // Alphabetical sort on auto-complete results.
                                                 function(x) {
                                                     return x;
                                                 })
                                    );
                                }
                            );
                        },
                        select: function(event, ui) {
                            $(this).autocomplete("close");
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
                    'search',
                    function(event) {
                        if (event.term != undefined) {
                            if(!self.display.is(':visible')) {
                                self.bus.fireEvent(new mol.bus.Event('search-display-toggle',{visible : true}));
                            }
                            self.search(event.term);

                            if(self.display.searchBox.val()=='') {
                                self.display.searchBox.val(event.term)
                            }

                        }
                   }
               );
                /**
                 * Clicking the go button executes a search.
                 */
                this.display.goButton.click(
                    function(event) {
                        $(self.display).autocomplete("close");
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
                        self.display.goButton.click();
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
                var self = this,
                    sql = this.sql.format(term),
                    params = {sql:sql, key: 'acr-{0}'.format(term)},
                    action = new mol.services.Action('cartodb-sql-query', params),
                    success = function(action, response) {
                        var results = {term:term, response:response},
                            event = new mol.bus.Event('search-results', results);
                        self.bus.fireEvent(new mol.bus.Event('hide-loading-indicator', {source : "search"}));
                        self.bus.fireEvent(event);
                    },
                    failure = function(action, response) {
                        self.bus.fireEvent(new mol.bus.Event('hide-loading-indicator', {source : "search"}));
                    };
                self.bus.fireEvent(new mol.bus.Event('show-loading-indicator', {source : "search"}));
                this.proxy.execute(action, new mol.services.Callback(success, failure));
                //this.bus.fireEvent('search', new mol.bus.Event('search', term));
            }
        }
    );

    mol.map.search.SearchDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-LayerControl-Search widgetTheme">' +
                    '    <div class="title ui-autocomplete-input">Search:</div>' +
                    '    <input class="value" type="text" placeholder="Search by name">' +
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

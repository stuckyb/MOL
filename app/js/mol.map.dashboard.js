mol.modules.map.dashboard = function(mol) {

    mol.map.dashboard = {};

    mol.map.dashboard.DashboardEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
                this.sql = '' +
                    'select DISTINCT * from get_dashboard_metadata() order by provider, taxa;';
            },
            /**
             * Starts the MenuEngine. Note that the container parameter is
             * ignored.
             */
            start: function() {

                this.initDialog();
                //this.addEventHandlers();
            },

            /**
             * Adds a handler for the 'search-display-toggle' event which
             * controls display visibility. Also adds UI event handlers for the
             * display.
             */
            addEventHandlers: function() {
                var self = this;

                /**
                 * Callback that toggles the dashboard display visibility.
                 *
                 * @param event mol.bus.Event
                 */
                this.bus.addHandler(
                    'taxonomy-dashboard-toggle',
                    function(event) {
                        var params = null,
                            e = null;

                        if (event.state === undefined) {
                            if(self.display.dialog('isOpen')) {
                                self.display.dialog('close');
                            } else {
                                self.display.dialog('open');
                            }
                        } else {
                            self.display.dialog(event.state);
                        }
                    }
                );

                _.each(
                    this.display.datasets,
                    function(dataset) {
                        var provider = $(dataset).find('.provider').attr('class').replace('provider','').trim(),
                            type = $(dataset).find('.type').attr('class').replace('type','').trim(),
                            _class = $(dataset).find('.class').attr('class').replace('class','').trim(),
                            data_table = $(dataset).find('.table').attr('class').replace('table','').trim();

                        $(dataset).find('.provider').click (
                            function(event) {
                                self.bus.fireEvent(new mol.bus.Event('metadata-toggle',{ params :{provider: provider, type: type, _class: _class, text: data_table}}));
                            }
                        );

                    }
                );
                _.each(
                    this.display.datasets.find('.type'),
                    function(td) {
                         var type = $(td).attr('class').replace('type','').trim();
                         $(td).click (
                                    function(event) {
                                        var _class = $(this).attr('class').replace('class','').trim();
                                        self.bus.fireEvent(new mol.bus.Event('metadata-toggle',{ params :{type: type}}));
                                    }
                         );
                    }
                )
            },

            /**
             * Fires the 'add-map-control' event. The mol.map.MapEngine handles
             * this event and adds the display to the map.
             */
            initDialog: function() {
                var self = this;
                $.post(
                    'cache/get',
                    {
                        key: 'dashboard-0907201248',
                        sql: this.sql
                    },
                    function(response) {
                        self.display = new mol.map.dashboard.DashboardDisplay(response.rows);
                        self.display.dialog(
                            {
                                autoOpen: false,
                                width: 850,
                                height:400,
                                dialogClass: "mol-Dashboard"
                            }
                        );
                        self.addEventHandlers();
                    }
                );

            }
        }
    );

    mol.map.dashboard.DashboardDisplay = mol.mvp.View.extend(
        {
            init: function(rows) {
                var html = '' +
                    '<div id="dialog">' +
                    '  <div class="dashboard">' +
                    '  <div class="title">Dashboard</div>' +
                    '  <div class="subtitle">Statistics for data served by the Map of Life</div>' +
                    '  <table class="dashtable">' +
                    '   <thead>' +
                    '    <tr>' +
                    '      <th><b>Dataset</b></th>' +
                    '      <th><b>Type</b></th>' +
                    '      <th><b>Source</b></th>' +
                    '      <th><b>Class</b></th>' +
                    '      <th><b>Species names</b></th>' +
                    '      <th><b>Records</b></th>' +
                    '    </tr>' +
                    '   </thead>' +
                    '   <tbody class="dashbody">' +
                    '   </tbody>' +
                    '  </table>' +
                    '</div>  ',
                    self = this;

                this._super(html);
                _.each(
                    rows,
                    function(row) {
                         $(self).find('.dashbody').append(new mol.map.dashboard.DashboardRowDisplay(row));
                    }
                )
                this.dashtable = $(this).find('.dashtable');
                this.dashtable.tablesorter(
                    { headers: { 0: { sorter: false}}, widthFixed: true}
                );
                this.datasets = $(this).find('.dataset');





            }
        }
    );
    mol.map.dashboard.DashboardRowDisplay = mol.mvp.View.extend(
        {
            init: function(row) {
                var html = '' +
                    '    <tr class="dataset">' +
                    '      <td class="table {7}">{7}</td>' +
                    '      <td class="type {0}">{1}</td>' +
                    '      <td class="provider {2}">{3}</td>' +
                    '      <td class="class {4}">{4}</td>' +
                    '      <td>{5}</td>' +
                    '      <td>{6}</td>' +
                    '    </tr>';
                this._super(html.format(row.type_id, row.type, row.provider_id, row.provider, row.taxa, row.species_count,row.feature_count, row.data_table));
            }
         }
    );
};
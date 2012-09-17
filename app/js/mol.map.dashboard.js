mol.modules.map.dashboard = function(mol) {

    mol.map.dashboard = {};

    mol.map.dashboard.DashboardEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
                this.url = "http://mol.cartodb.com/api/v2/sql?callback=?&q={0}"
                this.summary_sql = '' +
                    'SELECT DISTINCT * ' + 
                    'FROM get_dashboard_summary()';
                this.dashboard_sql = '' +
                    'SELECT DISTINCT * ' + 
                    'FROM get_dashboard_metadata() ' +
                    'ORDER BY provider, classes;';
                this.summary = null;
            },
            start: function() {
                this.initDialog();
            },

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
                        var provider = $(dataset).find('.provider')
                               .attr('class').replace('provider','').trim(),
                            type = $(dataset).find('.type')
                                .attr('class').replace('type','').trim(),
                            _class = $(dataset).find('.class')
                                .attr('class').replace('class','').trim(),
                            data_table = $(dataset).find('.table')
                                .attr('class').replace('table','').trim();

                        $(dataset).find('.provider').click (
                            function(event) {
                                self.bus.fireEvent(
                                    new mol.bus.Event(
                                        'metadata-toggle',
                                        {params:
                                            {provider: provider, 
                                             type: type, 
                                             _class: _class, 
                                             text: data_table}}));
                                        
                            }
                        );

                    }
                );
                _.each(
                    this.display.datasets.find('.type'),
                    function(td) {
                         var type = $(td).attr('class')
                                .replace('type','').trim();
                         $(td).click (
                                function(event) {
                                    var _class = $(this)
                                            .attr('class')
                                                .replace('class','').trim();
                                    self.bus.fireEvent(
                                        new mol.bus.Event(
                                            'metadata-toggle',
                                            {params:{type: type}}));
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
                
                $.getJSON(
                    this.url.format(this.dashboard_sql),
                    function(response) {
                        self.display = new mol.map.dashboard.DashboardDisplay(
                            response.rows, self.summary
                        );
                        self.display.dialog(
                            {
                                autoOpen: false,
                                width: 946,
                                height: 360,
                                minHeight: 360,
                                dialogClass: "mol-Dashboard",
                                title: 'Dashboard - ' + 
                                'Statistics for Data Served by the Map of Life'
                            }
                        );
                        
                        self.addEventHandlers();
                    }
                );
                $.getJSON(
                    this.url.format(this.summary_sql),
                    function(response) {
                        self.summary = response.rows[0];
                        if(self.display) {
                            self.display.fillSummary(self.summary);
                        }
                    }
                );
            }
        }
    );

    mol.map.dashboard.DashboardDisplay = mol.mvp.View.extend(
        {
            init: function(rows, summary) {
                var html = '' +
                    '<div id="dialog">' +
                    '  <div class="summary">' +
                    '    <span class="label">Data sources:</span>' +
                    '    <span class="providers"></span>' +
                    '    <span class="label">Datasets:</span>' +
                    '    <span class="datasets"></span>' +
                    '    <span class="label">Species names:</span>' +
                    '    <span class="names"></span>' +
                    '    <span class="label">Valid taxons:</span>' +
                    '    <span class="taxon_matches"></span>' +
                    '    <span class="label">Recognized synonyms:</span>' +
                    '    <span class="syn_matches"></span>' +
                    '    <span class="label">Total possible taxons:</span>' +
                    '    <span class="taxon_total"></span>' +
                    '    <span class="label">Total records:</span>' +
                    '    <span class="record_total"></span>' +
                    '  </div>' +
                    '  <div id="dashTypeFilter">' +
                    '    <div id="dashTitle" class="title">' + 
                            'Datasets' + 
                    '    </div><br/>' +
                    // taxa filter
                    '    <div>' + 
                    '      <span class="filterHeader">Filter by Taxa</span>' + 
                    '    </div>' +
                    '    <div class="chkAndLabel">' + 
                    '      <input type="checkbox" checked="checked" ' + 
                             'name="amphibia" class="taxaChk"/>' + 
                    '      <label for="amphibia">Amphibians</label>' + 
                    '    </div>' +
                    '    <div class="chkAndLabel">' + 
                    '      <input type="checkbox" checked="checked" ' + 
                             'name="aves" class="taxaChk"/>' + 
                    '      <label for="aves">Birds</label>' + 
                    '    </div>' +
                    '    <div class="chkAndLabel">' + 
                    '      <input type="checkbox" checked="checked" ' + 
                             'name="fish" class="taxaChk"/>' + 
                    '      <label for="fish">Fish</label>' + 
                    '    </div>' +
                    '    <div class="chkAndLabel">' + 
                    '      <input type="checkbox" checked="checked" ' + 
                             'name="insecta" class="taxaChk"/>' + 
                    '      <label for="insecta">Insects</label> ' +
                    '    </div>' +
                    '    <div class="chkAndLabel">' + 
                    '      <input type="checkbox" checked="checked" ' + 
                             'name="mammalia" class="taxaChk"/>' + 
                    '      <label for="mammalia">Mammals</label> ' +
                    '    </div>' +
                    '    <div class="chkAndLabel">' + 
                    '      <input type="checkbox" checked="checked" ' + 
                             'name="reptilia" class="taxaChk"/>' + 
                    '      <label for="reptilia">Reptiles</label> ' +
                    '    </div>' +
                    '    <br/>' +
                    '    <br/>' +
                    // type filter
                    '    <div>' + 
                    '      <span class="filterHeader">Filter by Type</span>' + 
                    '    </div>' +
                    '    <div class="chkAndLabel">' + 
                    '      <input type="checkbox" checked="checked" ' + 
                             'name="expertRan" class="typeChk"/>' + 
                    '      <label for="expertRan">Expert Range Maps</label>' + 
                    '    </div>' +
                    '    <div class="chkAndLabel">' + 
                    '      <input type="checkbox" checked="checked" ' + 
                             'name="pointObs" class="typeChk"/>' + 
                    '      <label for="pointObs">Point Observations</label>' + 
                    '    </div>' +
                    '    <div class="chkAndLabel">' + 
                    '      <input type="checkbox" checked="checked" ' + 
                             'name="localInv" class="typeChk"/>' + 
                    '      <label for="localInv">Local Inventories</label>' + 
                    '    </div>' +
                    '    <div class="chkAndLabel">' + 
                    '      <input type="checkbox" checked="checked" ' + 
                             'name="regionalChe" class="typeChk"/>' + 
                    '      <label for="regionalChe">' + 
                            'Regional Checklists</label> ' +
                    '    </div>' +
                    '  </div>' +
                    '    <div class="mol-Dashboard-TableWindow">' +
                    '      <table class="dashtable">' +
                    '       <thead>' +
                    '        <tr>' +
                    '          <th><b>Dataset</b></th>' +
                    '          <th><b>Type</b></th>' +
                    '          <th><b>Source</b></th>' +
                    '          <th><b>Class</b></th>' +
                    '          <th><b>Species names</b></th>' +
                    '          <th><b>Records</b></th>' +
                    '        </tr>' +
                    '       </thead>' +
                    '       <tbody class="tablebody"></tbody>' +
                    '      </table>' +
                    '    </div>' +
                    '</div>  ',
                    self = this,
                    numsets = 0;

                this._super(html);
                _.each(
                    rows,
                    function(row) {
                        numsets++;
                         $(self).find('.tablebody')
                            .append(
                                new mol.map.dashboard.DashboardRowDisplay(row));
                    }
                )
                
                $(this).find('#dashTitle')
                    .html(numsets + ' Datasets Shown');
                
                this.dashtable = $(this).find('.dashtable');
                this.dashtable.tablesorter({ 
                                sortList: [[1,1]],
                                widthFixed: false
                                });
                this.datasets = $(this).find('.dataset');
                
                this.dashtable.find("tr.master")
                    .click(function(){ 
                        $(this).parent().find('tr').each(
                            function(index, elem) {
                                if($(elem).hasClass('selectedDashRow')) {
                                    $(elem).removeClass('selectedDashRow');
                                }
                            }
                        )
                        
                        $(this).addClass('selectedDashRow');
                    }
                );
                
                $(this).find("input:checkbox").change(
                    function() {
                        var numHidden = 0;
                        
                        if($(this).hasClass('taxaChk')) {
                            self.toggleTaxa(
                                $(self).find('.tablebody tr'), 
                                this,
                                $(this).is(':checked'));
                        }   
                        else
                        {
                            self.toggleType(
                                $(self).find('.tablebody tr'), 
                                $(this).attr('name'),
                                $(this).is(':checked'));
                        }
                                
                                
                        _.each(
                            $(self).find('.tablebody tr'),
                            function(row) {
                                if($(row).css('display') == "none") {
                                    numHidden++;
                                }
                            }
                        )
                        
                        $(self).find('#dashTitle')
                            .html(numsets-numHidden + ' Datasets Shown');
                    });
                    if(summary!=null) {
                        self.fillSummary(summary);
                    }
            },
            
            fillSummary: function(summary) {
                var self = this;
                _.each(
                    _.keys(summary),
                    function(stat){
                        $(self).find('.{0}'.format(stat)).text(summary[stat]);
                    }
                )
            },
            
            toggleType: function(rows, type, checked) {
                var rowType;
                
                switch(type) {
                    case 'expertRan':
                        rowType = 'Expert range map';
                        break;
                    case 'pointObs':
                        rowType = 'Point observation';
                        break;
                    case 'localInv':
                        rowType = 'Local inventory';
                        break;
                    case 'regionalChe':
                        rowType = 'Regional checklist';
                        break;
                }
                
                _.each(
                    rows,
                    function(row) {
                        if($(row).find('td.type').html() == rowType) {
                            if(checked) {
                                $(row).show();
                            } else {
                                $(row).hide();
                            }
                        }
                    }
                );
            },
            
            toggleTaxa: function(rows, chkbox, checked) {
                var rowClasses,
                    chkboxes,
                    type = $(chkbox).attr('name'),
                    i,
                    j;
                
                _.each(
                    rows,
                    function(row) {
                        rowClasses = $(row).find('td.class').html().split(',');
                        
                        if(rowClasses.length == 1)
                        {
                            if(rowClasses[0] == type) {
                                if(checked) {
                                    $(row).show();
                                } else {
                                    $(row).hide();
                                }
                            }
                        }
                        else
                        {
                            chkboxes = $(chkbox).parent().parent()
                                            .find('div input.taxaChk');
                            
                            classLoop:
                            for(i=0;i < rowClasses.length;i++)
                            {
                                //loop through checkboxes
                                for(j=0;j < chkboxes.length;j++) {
                                    if($(chkboxes[j]).attr('name') == 
                                           rowClasses[i] && 
                                           $(chkboxes[j]).is(':checked')) {
                                       $(row).show();
                                       break classLoop; 
                                    }
                                    
                                    if(j == chkboxes.length-1 && 
                                           i == rowClasses.length-1 && 
                                           $(chkboxes[j]).attr('name') != 
                                               rowClasses[i]) {
                                        if(rowClasses[i] == type) {
                                            if(checked) {
                                                $(row).show();
                                            } else {
                                                $(row).hide();
                                            }
                                        }       
                                    }
                                }  
                            }
                            
                            
                        }
                    }
                );
            }
        }
    );
    mol.map.dashboard.DashboardRowDisplay = mol.mvp.View.extend(
        {
            init: function(row) {
                var html = '' +
                    '    <tr class="master dataset">' +
                    '      <td class="table {7}">{7}</td>' +
                    '      <td class="type {0}">{1}</td>' +
                    '      <td class="provider {2}">{3}</td>' +
                    '      <td class="class {4}">{5}</td>' +
                    '      <td class="spnames">{6}</td>' +
                    '      <td>{7}</td>' +
                    '    </tr>';
                this._super(
                    html.format(
                        row.type_id, 
                        row.type, 
                        row.provider_id, 
                        row.provider, 
                        row.classes.split(',').join(' '), 
                        row.classes.split(',').join(', '), 
                        row.species_count,
                        row.feature_count, 
                        row.data_table));
            }
         }
    );
};
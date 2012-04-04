mol.modules.map.dashboard = function(mol) {

    mol.map.dashboard = {};

    mol.map.dashboard.DashboardEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
                this.sql = '';
//Here is the sql to use for polygon dash requests.
/*SELECT s.provider as provider, s.type as type, num_species, num_records, s.class FROM
    (SELECT provider, type, count(*) as num_species, class
        FROM
        (SELECT DISTINCT scientificname, provider, type from gbif_import) p,
        (SELECT DISTINCT scientific, class from master_taxonomy) t
    WHERE p.scientificname = t.scientific
    GROUP BY provider, type, class
        ) s,
    (SELECT provider, type, count(*) as num_records, class
    FROM
        (SELECT scientificname, provider, type from gbif_import) pr,
        (SELECT DISTINCT scientific, class from master_taxonomy) tr
    WHERE pr.scientificname = tr.scientific
    GROUP BY provider, type, class
        ) r
 WHERE
    r.provider = s.provider and r.type = s.type and r.class = s.class;
*/            },

            /**
             * Starts the MenuEngine. Note that the container parameter is
             * ignored.
             */
            start: function() {
                this.display = new mol.map.dashboard.DashboardDisplay();
                this.initDialog();
                this.addEventHandlers();
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
                            self.display.dialog('open');
                        } else {
                            self.display.dialog(event.state);
                        }
                    }
                );
            },

            /**
             * Fires the 'add-map-control' event. The mol.map.MapEngine handles
             * this event and adds the display to the map.
             */
            initDialog: function() {
                this.display.dialog(
                    {
                        autoOpen: false,
					    width: 800
					         /*buttons: {
						          "Ok": function() {
							           $(this).dialog("close");
						          }
					         }*/
                    }
                );
            }
        }
    );

    mol.map.dashboard.DashboardDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div id="dialog" class="mol-LayerControl-Results">' +
                    '  <div class="dashboard">' +
                    '  <div class="title">Dashboard</div>' +
                    '  <div class="subtitle">Statistics for data served by the Map of Life</div>' +
                    '  <table>' +
                    '    <tr>' +
                    '      <td width="50px"><b>Type</b></td>' +
                    '      <td width="100px"><b>Source</b></td>' +
                    '      <td><b>Amphibians</b></td>' +
                    '      <td><b>Birds</b></td>' +
                    '      <td><b>Mammals</b></td>' +
                    '      <td><b>Reptiles</b></td>' +
                    '      <td><b>Fish</b></td>' +
                    '    </tr>' +
                    '    <tr>' +
                    '      <td>Points</td>' +
                    '      <td>GBIF</td>' +
                    '      <td>5,662 species names with 1,794,441 records</td>' +
                    '      <td>13,000 species names with 132,412,174 records</td>' +
                    '      <td>14,095 species names with 4,351,065 records</td>' +
                    '      <td>11,445 species names with 1,695,170 records</td>' +
                    '      <td></td>' +
                    '   <tr>' +
                    '       <td>Expert maps</td>' +
                    '       <td>User-uploaded</td>' +
                    '       <td></td>' +
                    '       <td>Jetz et al. 2012: 9,869 species with 28,019 records</td>' +
                    '       <td></td>' +
                    '       <td></td>' +
                    '       <td>Page and Burr, 2011: 723 species with 9,755 records</td>' +
                    '   </tr>' +
                    '   <tr>' +
                    '       <td>Expert maps</td>' +
                    '       <td>IUCN</td>' +
                    '       <td>5,966 species with 18,852 records</td>' +
                    '       <td></td>' +
                    '       <td>4,081 species with 38,673 records</td>' +
                    '       <td></td>' +
                    '       <td></td>' +
                    '   </tr>' +
                    '   <tr>' +
                    '       <td>Local Inventories</td>' +
                    '       <td>Misc. sources</td>' +
                    '       <td></td>' +
                    '       <td></td>' +
                    '       <td></td>' +
                    '       <td></td>' +
                    '       <td></td>' +
                    '   </tr>' +
                    '   <tr>' +
                    '       <td>Regional checklists</td>' +
                    '       <td>WWF</td>' +
                    '       <td></td>' +
                    '       <td></td>' +
                    '       <td></td>' +
                    '       <td></td>' +
                    '       <td></td>' +
                    '   </tr>' +
                    '  </table>' +
                    '</div>  ';

                this._super(html);
            }
        }
    );
};




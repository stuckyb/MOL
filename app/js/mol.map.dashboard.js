mol.modules.map.dashboard = function(mol) {
    
    mol.map.dashboard = {};
    
    mol.map.dashboard.DashboardEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
            },
            
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
					         width: 800,
					         buttons: {
						          "Ok": function() { 
							           $(this).dialog("close"); 
						          }
					         }
                    }
                );
            }            
        }
    );
    
    mol.map.dashboard.DashboardDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +                    
                    '<div id="dialog" class="mol-LayerControl-Results" style="">' +
                    '  <div class="dashboard">' +
                    '  <div class="title">Dashboard</div>' +
                    '  <div class="subtitle">Statistics for data served by the Map of Life</div>' +
                    '  <table>' +
                    '    <tr>' +
                    '      <td width="100px"><b>Source</b></td>' +
                    '      <td><b>Amphibians</b></td>' +
                    '      <td><b>Birds</b></td>' +
                    '      <td><b>Mammals</b></td>' +
                    '      <td><b>Reptiles</b></td>' +
                    '    </tr>' +
                    '    <tr>' +
                    '      <td>GBIF points</td>' +
                    '      <td>500 species with records</t>' +
                    '      <td>1,500 species with 30,000 records</td>' +
                    '      <td>152 species with 88,246 records</td>' +
                    '      <td>800 species with 100,000 records</td>' +
                    '    </tr>' +
                    '  </table>' +    
                    '</div>  ';

                this._super(html);
            }
        }
    );    
};
    
        
            

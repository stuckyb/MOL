mol.modules.map.feature = function(mol) {
    
    mol.map.feature = {};
    
    mol.map.feature.FeatureEngine = mol.mvp.Engine.extend({
        init : function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            //TODO add
            this.url = '';
            //TODO add
            this.sql = '';
            
            this.clickDisabled = false;
        },

        start : function() {
            this.addFeatureDisplay();
            this.addEventHandlers();
        },
        
        addEventHandlers : function () {
            var self = this;
            
            this.bus.addHandler(
                'layer-click-toggle',
                function(event) {
                    self.clickDisabled = event.disable;
                }
            );
                
            //may want to wait to add this until ready
            google.maps.event.addListener(
                self.map,
                "click",
                function () {
                    //TODO also check if layers are visible
                    //check this from results?
                    if(!self.clickDisabled && 
                        self.map.overlayMapTypes.length > 0) {
                        //TODO make request here
                    }
                }
            );
        },
        
        addFeatureDisplay : function() {
            this.display = new mol.map.FeatureDisplay();
        }
    });
    
    mol.map.FeatureDisplay = mol.mvp.View.extend({
        init : function(names) {
            var className = 'mol-Map-FeatureDisplay',
                html = '' +
                    '<div></div>';

            this._super(html);
        }
    });
}


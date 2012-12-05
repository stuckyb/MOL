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
        },

        start : function() {
            this.addEventHandlers();
        },
        
        addEventHandlers : function () {
            var self = this;
        }
    });
}

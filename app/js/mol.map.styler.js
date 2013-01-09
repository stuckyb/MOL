mol.modules.map.styler = function(mol) {
    mol.map.styler = {};
    
    mol.map.styler.StylerEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
        },
        
        start: function() {
            this.display = new mol.map.styler.StylerDisplay();
            this.addEventHandlers();
        },
        
        addEventHandlers: function() {
            
        }
    });
    
    mol.map.styler.StylerDisplay = mol.mvp.View.extend({
        init: function(styler) {
            var html = '' + 
                       '<div>Something here.</div>',
                self = this;
                
            this._super(html);
        }
    });
}

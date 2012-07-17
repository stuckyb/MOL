/*
 *  Module to bootstrap the MOL UI from parameters passed on the querystring.
 *
 */
mol.modules.map.boot = function(mol) {

    mol.map.boot = {};

    mol.map.boot.BootEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
                this.IE8 = false;
                this.sql = '' +
                    'SELECT DISTINCT l.scientificname as name,' +
                    '       l.type as type,'+
                    '       t.title as type_title,'+
                    '       l.provider as source, '+
                    '       p.title as source_title,'+
                    '       n.class as _class, ' +
                    '       l.feature_count as feature_count,'+
                    '       n.common_names_eng as names,' +
                    '       CONCAT(\'{sw:{lat:\',ST_XMin(l.extent),\', lng:\',ST_YMin(l.extent),\'} , ne:{lat:\',ST_XMax(l.extent),\', lng:\',ST_YMax(l.extent),\'}}\') as extent ' +
                    'FROM layer_metadata l ' +
                    'LEFT JOIN types t ON ' +
                    '       l.type = t.type ' +
                    'LEFT JOIN providers p ON ' +
                    '       l.provider = p.provider ' +
                    'LEFT JOIN taxonomy n ON ' +
                    '       l.scientificname = n.scientificname ' +
                    'WHERE ' +
                    "  l.scientificname~*'\\m{0}' OR n.common_names_eng~*'\\m{0}'";
                this.term = null;
             },

            /**
             * Starts the BootEngine.
             */
            start: function() {
               this.boot();
            },
            boot: function() {

                var self=this;

                this.term = unescape(window.location.pathname.replace(/\//g,'').replace(/\+/g,' ').replace(/_/g,' '));

                if((this.getIEVersion()>=0&&this.getIEVersion()<=8)||this.term=='') {
                    //If on IE8- or no query params fire the splash event
                    this.bus.fireEvent(new mol.bus.Event('toggle-splash'));
                } else {
                    //Otherwise, try and get a result using term
                    $.post(
                        'cache/get',
                        {
                            key:'layer-metadata-{0}'.format(self.term),
                            sql:this.sql.format(self.term)
                        },
                        function (response) {
                            var results = mol.services.cartodb.convert(response);
                            if(Object.keys(results.layers).length==0) {
                            	//we got nothin', so splash
                                self.bus.fireEvent(new mol.bus.Event('toggle-splash'));
                            } else {
                                //parse the results
                                self.loadLayers(results.layers);
                            }
                        },
                        'json'
                     );
                }
            },
            loadLayers: function(layers) {
                if(Object.keys(layers).length<=25) {
                	//Map layers if there are 25 or less
                    this.bus.fireEvent(new mol.bus.Event('add-layers',{layers: layers}))
                } else if (this.term != null) {
                    this.bus.fireEvent(new mol.bus.Event('search',{term: this.term}));
                }
            },
	        /* Returns the version of Internet Explorer or a -1
            / (indicating the use of another browser).
            */
	        getIEVersion: function() {
  		        var rv = -1, ua,re; // Return value assumes failure.
  			    if (navigator.appName == 'Microsoft Internet Explorer'){
    				ua = navigator.userAgent;
   				    re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
    				if (re.exec(ua) != null){
      					rv = parseFloat( RegExp.$1 );
				}
			}
  			return rv;
		}
    }
    );
};




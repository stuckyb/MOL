mol.modules.map.boot = function(mol) {

    mol.map.boot = {};

    mol.map.boot.BootEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
                this.IE8 = false;
                this.sql = '' +
                    'SELECT * from get_search_results(\'{0}\'); ';
                this.term = null;
             },

            /**
             * Starts the BootEngine. Note that the container parameter is
             * ignored.
             */
            start: function() {
               this.boot();
            },
            boot: function() {

                var self=this;

                this.term = unescape(window.location.pathname.replace(/\//g,'').replace(/\+/g,' ').replace(/_/g,' '));

                if((this.getIEVersion()>=0&&this.getIEVersion()<=8)||this.term=='') {
                    //If on IE8- or no query params fire the splash event
                } else {
                    //Otherwise, try and get a result using term
                    $.post(
                        'cache/get',
                        {
                            key:'search-results-{0}'.format(self.term),
                            sql:this.sql.format(self.term)
                        },
                        function (response) {
                            var results = mol.services.cartodb.convert(response);
                            if(results.length==0) {
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
                if(Object.keys(layers).length<100) {
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
		},
		addIframeHandlers: function () {
		    var self = this;

		    $(this.display.iframe_content[0].contentDocument.body).find('.getspecies').click(
		          function(event) {
		               $(self.display).dialog('option','modal','false');
		               $(self.display.parent()).animate({left: '{0}px'.format($(window).width()/(7/4)-400)}, 'slow');
		               self.bus.fireEvent(new mol.bus.Event('search', {term:'Puma concolor'}));
		               setTimeout(function() {self.bus.fireEvent(new mol.bus.Event('results-select-all'))},1000);
		               setTimeout(function() {self.bus.fireEvent(new mol.bus.Event('results-map-selected'))},2000);


		          }
		    );
            $(this.display.iframe_content[0].contentDocument.body).find('.listdemo1').click(
                  function(event) {
                      $(self.display).dialog('option','modal','false');
                      $(self.display.parent()).animate({left: '{0}px'.format($(window).width()/3-400)}, 'slow');
                      self.bus.fireEvent(new mol.bus.Event('layer-display-toggle',{visible: false}));
                      self.bus.fireEvent(new mol.bus.Event('species-list-query-click', {gmaps_event:{latLng : new google.maps.LatLng(-2.263,39.045)}, map : self.map}));
                  }
            );

		},
    }
    );
};




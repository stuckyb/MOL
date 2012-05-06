mol.modules.map.splash = function(mol) {

    mol.map.splash = {};

    mol.map.splash.SplashEngine = mol.mvp.Engine.extend(
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
                this.display = new mol.map.splash.splashDisplay();
                this.initDialog();
            },
            initDialog: function() {
                this.display.dialog(
                    {
                        autoOpen: true,
					    width: 800,
					    height: 500,
					    dialogClass: "mol-splash",
					    modal: true
                    }
                );
                 $(this.display).width('98%');

            }
        }
    );

    mol.map.splash.splashDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
        '<div>' +
        '<iframe class="mol-splash iframe_content ui-dialog-content" style="height:350px; width: 95%;" src="https://docs.google.com/document/pub?id=1vrttRdCz4YReWFq5qQmm4K6WmyWayiouEYrYtPrAyvY&amp;embedded=true"></iframe>' +
	'<div id="footer_imgs" style="text-align: center">' + 
        '<div>Our sponsors and partners</div>' + 
	'<a target="_blank" href="http://www.nsf.gov/"><button><img title="National Science Foundation" src="http://www.mappinglife.org/static/home/nsf.png"></button></a>' + 
	'<a target="_blank" href="http://www.nasa.gov/"><button><img title="National Aeronautics and Space Administration" src="http://www.mappinglife.org/static/home/nasa.png"></button></a>' + 
	'<a target="_blank" href="http://www.nceas.ucsb.edu/"><button><img title="National Center for Ecological Analysis and Synthesis" src="http://www.mappinglife.org/static/home/nceas.png"></button></a>' + 
	'<a target="_blank" href="http://www.iplantcollaborative.org/"><button><img title="iPlant Collaborative" src="http://www.mappinglife.org/static/home/iplant.png"></button></a>' + 
	'<a target="_blank" href="http://www.mountainbiodiversity.org/"><button><img title="Global Mountain Biodiversity Assessment" src="http://www.mappinglife.org/static/home/gmba.png"></button></a>' + 
	'<a target="_blank" href="http://www.senckenberg.de"><button><img title="Senckenberg" src="http://www.mappinglife.org/static/home/senckenberg.png"></button></a>' + 
	'<a target="_blank" href="http://www.bik-f.de/"><button><img title="Biodiversität und Klima Forschungszentrum (BiK-F)" src="http://www.mappinglife.org/static/home/bik_bildzeichen.png"></button></a>' + 
	'<a target="_blank" href="http://www.eol.org/"><button><img title="Encyclopedia of Life" src="http://www.mappinglife.org/static/home/eol.png"></button></a>' + 
	'</div>' +
        '</div>';

                this._super(html);
                this.iframe_content = $(this).find('.iframe_content');

            }
        }
    );
};




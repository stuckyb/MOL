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
        '<iframe class="mol-splash iframe_content ui-dialog-content" style="height:330px; width: 95%;" src="/static/splash/index.html"></iframe>' +
	'<div id="footer_imgs" style="text-align: center">' +
        '<div>Our sponsors, partners and supporters</div>' +
        '<a target="_blank" href="http://www.yale.edu/jetz/"><button><img width="72px" height="36px" title="Jetz Lab, Yale University" src="/static/home/yale.png"></button></a>' +
        '<a target="_blank" href="http://sites.google.com/site/robgur/"><button><img width="149px" height="36px" title="Guralnick Lab, University of Colorado Boulder" src="/static/home/cuboulder.png"></button></a>' +

        '<a target="_blank" href="http://www.iucn.org/"><button><img width="33px" height="32px" title="International Union for Conservation of Nature" src="/static/home/iucn.png"></button></a>' +
        '<a target="_blank" href="http://www.gbif.org/"><button><img width="33px" height="32px" title="Global Biodiversity Information Facility" src="/static/home/gbif.png"></button></a>' +
	'<a target="_blank" href="http://www.eol.org/"><button><img width="51px" height="32px" title="Encyclopedia of Life" src="http://www.mappinglife.org/static/home/eol.png"></button></a>' +
	'<a target="_blank" href="http://www.nasa.gov/"><button><img width="37px" height="32px" title="National Aeronautics and Space Administration" src="http://www.mappinglife.org/static/home/nasa.png"></button></a>' +
        '<br>' + 
	'<a target="_blank" href="http://www.nceas.ucsb.edu/"><button><img width="30px" height="32px" title="National Center for Ecological Analysis and Synthesis" src="http://www.mappinglife.org/static/home/nceas.png"></button></a>' +
	'<a target="_blank" href="http://www.iplantcollaborative.org/"><button><img width="105px" height="32px" title="iPlant Collaborative" src="http://www.mappinglife.org/static/home/iplant.png"></button></a>' +
	'<a target="_blank" href="http://www.nsf.gov/"><button><img width="32px" height="32px" title="National Science Foundation" src="http://www.mappinglife.org/static/home/nsf.png"></button></a>' +
	'<a target="_blank" href="http://www.senckenberg.de"><button><img width="81px" height="32px"title="Senckenberg" src="http://www.mappinglife.org/static/home/senckenberg.png"></button></a>' +
	'<a target="_blank" href="http://www.bik-f.de/"><button><img width="74px" height="32px" title="Biodiversität und Klima Forschungszentrum (BiK-F)" src="http://www.mappinglife.org/static/home/bik_bildzeichen.png"></button></a>' +
	'<a target="_blank" href="http://www.mountainbiodiversity.org/"><button><img width="59px" height="32px" title="Global Mountain Biodiversity Assessment" src="http://www.mappinglife.org/static/home/gmba.png"></button></a>' +
	'</div>' +
        '</div>';

                this._super(html);
                this.iframe_content = $(this).find('.iframe_content');

            }
        }
    );
};




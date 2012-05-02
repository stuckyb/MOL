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
                    '<iframe class="mol-splash iframe_content" src="https://docs.google.com/document/pub?id=1vrttRdCz4YReWFq5qQmm4K6WmyWayiouEYrYtPrAyvY&amp;embedded=true"></iframe>';

                this._super(html);
                this.iframe_content = $(this).find('.iframe_content');

            }
        }
    );
};




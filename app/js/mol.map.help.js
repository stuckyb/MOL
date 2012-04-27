mol.modules.map.help = function(mol) {

    mol.map.help = {};

    mol.map.help.HelpDialog = mol.mvp.Engine.extend(
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
                alert("Start!");
                this.display = new mol.map.help.helpDisplay();
                this.initDialog();
                this.addEventHandlers();
            },

            addEventHandlers: function() {
                var self = this;

                alert("Adding handler");

                this.bus.addHandler(
                    'help-display-dialog',
                    function(event) {
                        var params = null,
                            e = null;

                        alert("Here!");

                        if(event.state === undefined) {
                            self.display.dialog('open');
                        } else {
                            self.display.dialog(event.state);
                        }
                    }
                );

                alert("Added");
            },

            initDialog: function() {
                this.display.dialog(
                    {
                        autoOpen: true,
		        width: "80%",
			height: 500,
			dialogClass: "mol-help",
			modal: false 
                    }
                );
                 $(this.display).width('98%');

            }
        }
    );

    mol.map.help.helpDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    'Hello, world!'

                this._super(html);
                // this.iframe_content = $(this).find('.iframe_content');

            }
        }
    );
};




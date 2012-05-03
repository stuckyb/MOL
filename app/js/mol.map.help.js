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
                this.display = new mol.map.help.helpDisplay();
                this.initDialog();
                this.addEventHandlers();
            },

            addEventHandlers: function() {
                var self = this;

                this.bus.addHandler(
                    'help-display-dialog',
                    function(event) {
                        var params = null,
                            e = null;

                        if(event.state === undefined) {
                            self.display.dialog('open');

                            // This is necessary, because otherwise the
                            // iframe comes out in the wrong size.
                            $(self.display).width('98%');
                        } else {
                            self.display.dialog(event.state);
                        }
                    }
                );
            },

            initDialog: function() {
                this.display.dialog(
                    {
                        autoOpen: false,
			dialogClass: "mol-help",
                        height: 500,
                        width: 800
                    }
                );

            }
        }
    );

    mol.map.help.helpDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<iframe id="help_dialog" class="mol-help iframe_content" src="https://docs.google.com/document/pub?id=1I64XqsJcoJ8GZAZhy6KmtlhtEht4tlaOrd-g82VFq-w&amp;embedded=true"></iframe>';

                this._super(html);

                // this.iframe_content = $(this).find('.iframe_content');
            }
        }
    );
};




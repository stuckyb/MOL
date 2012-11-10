mol.modules.mobile = function(mol) {

    mol.mobile = {};

    mol.mobile.submodules = [
            'query',
    ];

    mol.mobile.MobileEngine = mol.mvp.Engine.extend(
        {
            init: function(api, bus) {
                this.api = api;
                this.bus = bus;
            },

            start: function(container) {
                this.display = $('body');
                this.addControls();
                this.addEventHandlers();
            },

            go: function(place) {

            },

            place: function() {
            },
            addControls: function() {

            },
            addEventHandlers: function() {
                var self = this;
                this.bus.addHandler(
                    'add-page',
                    function (event) {
                        if(event.display) {
                            self.display.page(event.display);
                        }
                    }
                );
            }
        }
    );
};

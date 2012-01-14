mol.modules.bus = function(mol) {

    mol.bus = {};
    
    mol.bus.Event = Class.extend(
        {
            init: function(type, action, config) {
                this.type = type;
                this.action = action;
                this.config = config;
            }
        }
    );

    mol.bus.Bus = function() {

        if (!(this instanceof mol.bus.Bus)) {
            return new mol.bus.Bus();
        }
        _.extend(this, Backbone.Events);

        this.fireEvent = function(event) {
            this.trigger(event.getType(), event);
        };

        this.addHandler = function(type, handler) {
            this.bind(
                type, 
                function(event) {
                    handler(event);
                }
            );
        };
        return this;
    };
};

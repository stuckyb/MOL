mol.modules.map.metadata = function(mol) {

    mol.map.metadata = {};

    mol.map.metadata.MetadataEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
                this.sql = '' +
                    'SELECT * FROM scientificnames WHERE ' +
                    '   CONCAT(scientificname, type, lower(provider)) = \'{0}{1}{2}\'';
           },

            /**
             * Starts the MenuEngine. Note that the container parameter is
             * ignored.
             */
            start: function() {
                this.layers = {};
                this.addEventHandlers();
            },
            getMetadata: function (layer) {
                  var self = this,
                    sql = this.sql.format(layer.name, layer.type, layer.source),
                    params = {sql:sql, key: 'metadata-{0}-{1}-{2}'.format(layer.name, layer.type, layer.source)},
                    action = new mol.services.Action('cartodb-sql-query', params),
                    success = function(action, response) {
                        var results = {layer:layer, response:response};
                        self.bus.fireEvent(new mol.bus.Event('hide-loading-indicator', {source : 'metadata-{0}-{1}-{2}'.format(layer.name, layer.type, layer.source)}));
                        self.layers['metadata-{0}-{1}-{2}'.format(layer.name, layer.type, layer.source)]
                            = new mol.map.metadata.MetadataDisplay(results);
                    },
                    failure = function(action, response) {
                        self.bus.fireEvent(new mol.bus.Event('hide-loading-indicator', {source : 'metadata-{0}-{1}-{2}'.format(layer.name, layer.type, layer.source)}));
                    };

                if(this.layers['metadata-{0}-{1}-{2}'.format(layer.name, layer.type, layer.source)] == undefined) {
                    self.bus.fireEvent(new mol.bus.Event('show-loading-indicator', {source : 'metadata-{0}-{1}-{2}'.format(layer.name, layer.type, layer.source)}));
                    this.proxy.execute(action, new mol.services.Callback(success, failure));
                } else {
                    if(this.layers['metadata-{0}-{1}-{2}'.format(layer.name, layer.type, layer.source)].dialog("isOpen")) {
                        this.layers['metadata-{0}-{1}-{2}'.format(layer.name, layer.type, layer.source)].dialog("close");
                    } else {
                        this.layers['metadata-{0}-{1}-{2}'.format(layer.name, layer.type, layer.source)].dialog("open")
                    }
                }

            },
            addEventHandlers: function() {
                var self = this;

                /**
                 * Callback that toggles the metadata display visibility.
                 *
                 * @param event mol.bus.Event
                 */
                this.bus.addHandler(
                    'metadata-toggle',
                    function(event) {
                        var params = null,
                            e = null;
                        if(event.layer){
                            self.getMetadata(event.layer);
                        }
                    }
                );
            }
        }
    );

    mol.map.metadata.MetadataDisplay = mol.mvp.View.extend(
        {
            init: function(results) {
                var self = this,
                    html = '' +
                        '<div id="dialog">';

               _.each(
                    results.response.rows[0],
                    function(val, key, list) {
                        html+='<div class="metakey-{0}"><div class="key">{0}</div></div>'.format(key,val);
                    }
                )

                html+='</div>';

                this._super(html);
                _.each(
                    results.response.rows,
                    function(col) {
                        _.each(
                            col,
                            function(val, key, list) {
                                $(self).find(".metakey-{0}".format(key)).append($('<div class="val">{0}<div>'.format(val)));
                            }
                        )
                    }
                );
                this.dialog(
                    {
                        autoOpen: true,

                        dialogClass: "mol-LayerMetadata"
                    }
                );
                //set first col widths
                $(this).find('.key').width(Math.max.apply(Math, $(self).find('.key').map(function(){ return $(this).width(); }).get()));
                //set total width
                this.dialog("option", "width",Math.max.apply(Math, $(self).find('.key').map(function(){ return $(this).width(); }).get())+Math.max.apply(Math, $(self).find('.val').map(function(){ return $(this).width(); }).get())+50);
            }
        }
    );

};




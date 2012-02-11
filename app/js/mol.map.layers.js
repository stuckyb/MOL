mol.modules.map.layers = function(mol) {

    mol.map.layers = {};

    mol.map.layers.LayerEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
            },

            start: function() {
                this.display = new mol.map.layers.LayerListDisplay('.map_container');
                this.fireEvents();
                this.addEventHandlers();
            },

            /**
             * Handles an 'add-layers' event by adding them to the layer list.
             * The event is expected to have a property named 'layers' which
             * is an arry of layer objects, each with a 'name' and 'type' property. 
             * This function ignores layers that are already represented
             * as widgets.
             */
            addEventHandlers: function() {
                var self = this;

                this.bus.addHandler(
                    'add-layers',
                    function(event) {
                        _.each(
                            event.layers,
                            function(layer) { // Removes duplicate layers.
                                if (self.display.getLayer(layer).length > 0) {
                                    event.layers = _.without(event.layers, layer);
                                }
                            }
                        );
                        self.addLayers(event.layers);
                    }
                );
            },

            /**
             * Fires the 'add-map-control' event. The mol.map.MapEngine handles
             * this event and adds the display to the map.
             */
            fireEvents: function() {
                var params = {
                        display: this.display,
                        slot: mol.map.ControlDisplay.Slot.TOP,
                        position: google.maps.ControlPosition.TOP_RIGHT
                    },
                    event = new mol.bus.Event('add-map-control', params);

                this.bus.fireEvent(event);
            },
            
            /**
             * Adds layer widgets to the map. The layers parameter is an array
             * of layer objects {id, name, type, source}.
             */
            addLayers: function(layers) {
                _.each(
                    layers,
                    function(layer) {
                        var l = this.display.addLayer(layer);
                            self = this;
                        
                        l.toggle.click(
                            function(event) {
                                
                            }
                        );
                    
                        l.click(
                            function(event) {
                                var showing = $(event.currentTarget).find('.toggle').is(':checked'),
                                    params = {
                                        layer: layer,
                                        showing: showing
                                    },
                                    e = new mol.bus.Event('layer-toggle', params);

                                self.bus.fireEvent(e);
                            }
                        );
                    },
                    this
                );

            }
        }
    );

    mol.map.layers.LayerDisplay = mol.mvp.View.extend(
        {
            init: function(layer) {
                var html = '' +

                    '<div class="layerContainer">' +
                    '  <div class="layer widgetTheme">' +
                    '    <button><img class="type" src="/static/maps/search/{0}.png"></button>' +
                    '    <div class="layerName">' +
                    '        <div class="layerNomial">{1}</div>' +
                    '    </div>' +
                    '    <div class="buttonContainer">' +
                    '        <input class="toggle" type="checkbox">' +
                    '        <span class="customCheck"></span> ' +
                    '    </div>' +                    
                    '    <button class="info">i</button>' +
                    '    <button class="zoom">z</button>' +
                    '    <input type="range" class="opacity" min="0" max="1.0" step=".10" />' +
                    '  </div>' +
                    '</div>';

                this._super(html.format(layer.type, layer.name));
                this.attr('id', layer.id);
                this.opacity = $(this.find('.opacity'));
                this.toggle = $(this.find('.toggle'));
                this.zoom = $(this.find('.zoom'));
                this.info = $(this.find('.info'));
            }
        }
    );

    mol.map.layers.LayerListDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div class="mol-LayerControl-Layers">' +
                    '  <div class="staticLink widgetTheme" style="display: none; ">' +
                    '    <input type="text" class="linkText">' +
                    '  </div>' +
                    '  <div class="scrollContainer" style="">' +
                    '    <ul id="sortable">' +
                    '    </ul>' +
                    '  </div>' +
                    '</div>';

                this._super(html);
                $(this.find("#sortable")).sortable();
		          $(this.find("#sortable")).disableSelection();
                this.open = false;
                this.views = {};
                this.layers = [];
                this.render();
            },

            getLayer: function(layer) {
                return $(this.find('#{0}'.format(layer.id)));
            },

            addLayer: function(layer) {
                var ld = new mol.map.layers.LayerDisplay(layer);

                $(this.find('#sortable')).append(ld);
                return ld;
            },

            render: function(howmany, order) {
                var self = this,
                    el = $(this.find('.dropdown'));

                el.find('li').each(
                    function(i ,el) {
                        $(el).remove();
                    }
                );

                _(this.layers.slice(0, howmany)).each(
                    function(layer) {
                        var v = self.views[layer.name];

                        if (v) {
                            delete self.views[layer.name];
                        }

                        v = new Layer(
                            {
                                layer: layer,
                                bus: self.bus
                            }
                        );

                        self.views[layer.name] = v;
                        el.find('a.expand').before(v.render().el);
                        //el.append(v.render().el);
                    }
                );

                if (howmany === self.layers.length) {
                    $(this.find('a.expand')).hide();
                } else {
                    $(this.find('a.expand')).show();
                }

                el.sortable(
                    {
                        revert: false,
                        items: '.sortable',
                        axis: 'y',
                        cursor: 'pointer',
                        stop: function(event,ui) {
                            $(ui.item).removeClass('moving');
                            //DONT CALL THIS FUNCTION ON beforeStop event, it will crash
                            self.sortLayers();
                        },
                        start:function(event,ui) {
                            $(ui.item).addClass('moving');
                        }
                    }
                );

                this.updateLayerNumber();
                return this;
            },

            updateLayerNumber: function() {
                var t = 0;
                _(this.layers).each(function(a) {
                                        if(a.enabled) t++;
                                    });
                $(this.find('.layer_number')).html(t + " LAYER"+ (t>1?'S':''));
            },

            sortLayers: function() {
                var order = [];
                $(this.find('li')).each(function(i, el) {
                                      order.push($(el).attr('id'));
                                  });
                this.bus.emit("map:reorder_layers", order);
            },

            open: function(e) {
                if(e) e.preventDefault();
                this.el.addClass('open');
                this.el.css("z-index","100");
                this.open = true;
            },

            close: function(e) {
                this.el.removeClass('open');
                this.el.css("z-index","10");
                this.open = false;
            },

            sort_by: function(layers_order) {
                this.layers.sort(function(a, b) {
                                     return _(layers_order).indexOf(a.name) -
                                         _(layers_order).indexOf(b.name);
                                 });
                this.open = true;
                this.hiding();
            },

            hiding: function(e) {
                if(!this.open) return;
                // put first what are showing
                this.layers.sort(function(a, b) {
                                     if(a.enabled && !b.enabled) {
                                         return -1;
                                     } else if(!a.enabled && b.enabled) {
                                         return 1;
                                     }
                                     return 0;
                                 });
                layers = _(this.layers).pluck('name');
                this.bus.emit("map:reorder_layers", layers);
                this.order = layers;
                this.render(3);
                this.close();
            }
        }
    );
};

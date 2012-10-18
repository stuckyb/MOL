mol.modules.map.menu = function(mol) {

    mol.map.menu = {};

    mol.map.menu.MenuEngine = mol.mvp.Engine.extend(
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
                this.display = new mol.map.menu.MenuDisplay();
                this.bottomdisplay = new mol.map.menu.BottomMenuDisplay();
                
                this.display.toggle(true);
                this.bottomdisplay.toggle(true);
                
                this.addEventHandlers();
                this.fireEvents();
            },

            /**
             * Adds a handler for the 'search-display-toggle' event which
             * controls display visibility. Also adds UI event handlers for the
             * display.
             */
            addEventHandlers: function() {
                var self = this;

                this.display.layersToggle.click(
                    function(event) {
                        if(self.display.layersToggle[0].src
                                .indexOf('collapse.png') > 0)  {
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'layer-display-toggle',
                                    {visible : false}));
                            self.display.layersToggle[0].src = 
                                '/static/maps/layers/expand.png';
                        } else {
                            self.bus.fireEvent(
                                new mol.bus.Event(
                                    'layer-display-toggle',
                                    {visible : true}));
                            self.display.layersToggle[0].src = 
                                '/static/maps/layers/collapse.png';
                        }
                    }
                );
                
                this.bottomdisplay.about.click(
                    function(Event) {
                        window.open('/about/');
                    }
                );


                this.bottomdisplay.help.click(
                    function(Event) {
                        self.bus.fireEvent(
                            new mol.bus.Event('help-display-dialog')
                        );
                    }
                );

                this.bottomdisplay.status.click(
                    function(Event) {
                        self.bus.fireEvent(
                            new mol.bus.Event('status-display-dialog')
                        );
                    }
                );

                this.bottomdisplay.feedback.click(
                    function(Event) {
                        self.bus.fireEvent(
                            new mol.bus.Event('feedback-display-toggle')
                        );
                    }
                );

                this.bus.addHandler(
                    'add-legend-toggle-button',
                    function(event) {
                        $(self.bottomdisplay).prepend(event.button);
                        self.bottomdisplay.legendItem = 
                            $(self.bottomdisplay).find('#legend');
                            
                        self.bottomdisplay.legendItem.click(
                            function(event) {
                                self.bus.fireEvent(
                                    new mol.bus.Event('legend-display-toggle'));
                            }
                        );
                    }
                );

                this.bus.addHandler(
                    'add-dashboard-toggle-button',
                    function(event) {
                        $(self.bottomdisplay).prepend(event.button);
                        self.bottomdisplay.dashboardItem = 
                            $(self.bottomdisplay).find('#dashboard');
                            
                        self.bottomdisplay.dashboardItem.click(
                            function(event) {
                                self.bus.fireEvent(
                                    new mol.bus.Event('taxonomy-dashboard-toggle'));
                            }
                        );
                    }
                );

                this.bus.addHandler(
                    'hide-layer-display-toggle',
                    function(event) {
                        self.display.layersToggle[0].style.visibility="hidden";
                    }
                );
                this.bus.addHandler(
                    'show-layer-display-toggle',
                    function(event) {
                        self.display.layersToggle[0].style.visibility="visible";
                    }
                );
                this.bus.addHandler(
                    'menu-display-toggle',
                    function(event) {
                        var params = null,
                        e = null;

                        if (event.visible === undefined) {
                            self.display.toggle();
                            params = {visible: self.display.is(':visible')};
                        } else {
                            self.display.toggle(event.visible);
                        }
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
                        slot: mol.map.ControlDisplay.Slot.MIDDLE,
                        position: google.maps.ControlPosition.TOP_RIGHT
                    },
                    bottomparams = {
                        display: this.bottomdisplay,
                        slot: mol.map.ControlDisplay.Slot.LAST,
                        position: google.maps.ControlPosition.RIGHT_BOTTOM  
                    },
                    event = new mol.bus.Event('add-map-control', params),
                    bottomevent = new mol.bus.Event(
                                    'add-map-control', bottomparams);

                this.bus.fireEvent(event);
                this.bus.fireEvent(bottomevent);
                              
            }
        }
    );

    mol.map.menu.MenuDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div id="topRightMenu" class="mol-LayerControl-Menu ">' +
                    '  <div class="label">' +
                    '    <img ' + 
                            'class="layersToggle" ' + 
                            'height="21px" ' + 
                            'width="24px" ' + 
                            'src="/static/maps/layers/collapse.png">' +
                    '    </div>' +
                    '</div>';

                this._super(html);
                this.layersToggle = $(this).find('.layersToggle');
            }
        }
    );
    
    mol.map.menu.BottomMenuDisplay = mol.mvp.View.extend(
        {
            init: function() {
                var html = '' +
                    '<div ' + 
                        'id="bottomRightMenu" ' + 
                        'class="mol-LayerControl-Menu">' +
                    '    <div title="Current known issues." class="widgetTheme status button">Status</div>' +
                    '    <div title="About the Map of Life Project." class="widgetTheme about button">About</div>' +
                    '    <div title="Submit feedback." class="widgetTheme feedback button">Feedback</div>' +
                    '    <div title="Get help." class="widgetTheme help button">Help</div>' +
                    '</div>';

                this._super(html);
                this.about = $(this).find('.about');
                this.help = $(this).find('.help');
                this.feedback = $(this).find('.feedback');
                this.status = $(this).find('.status');
            }
        }
    );
};


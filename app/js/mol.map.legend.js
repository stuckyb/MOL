mol.modules.map.legend = function(mol) {

    mol.map.legend = {};

    mol.map.legend.LegendEngine = mol.mvp.Engine.extend(
    {
        init : function(proxy, bus, map) {
                this.proxy = proxy;
                this.bus = bus;
                this.map = map;
                //this.sql = "" +
                        "SET STATEMENT_TIMEOUT TO 0;" +
                        "SELECT DISTINCT scientificname " +
                        "FROM polygons " +
                        "WHERE ST_DWithin(the_geom_webmercator,ST_Transform(ST_PointFromText('POINT({0})',4326),3857),{1}) " +
                        //"WHERE ST_DWithin(the_geom,ST_PointFromText('POINT({0})',4326),0.1) " +
                        " {2} ORDER BY scientificname";

        },
        start : function() {
            this.addQueryDisplay();
            this.addEventHandlers();
        },
        /*
         *  Build the legend display and add it as a control to the bottom right of the map display.
         */
        addLegendDisplay : function() {
                var params = {
                    display: null,
                    slot: mol.map.ControlDisplay.Slot.LAST,
                    position: google.maps.ControlPosition.RIGHT_BOTTOM
                 };
                this.display = new mol.map.QueryDisplay();
                params.display = this.display;
                this.bus.fireEvent( new mol.bus.Event('add-map-control', params));
        },
        addEventHandlers : function () {
            var self = this;
        }
    }
    );

    mol.map.LegendDisplay = mol.mvp.View.extend(
    {
        init : function(names) {
            var className = 'mol-Map-LegendDisplay',
                html = '' +
                        '<div class="' + className + ' widgetTheme">' +
                        '   <ul>' +
                        '       <li></li>' +
                        '' +
                        '</div>';

            this._super(html);
            this.resultslist=$(this).find('.resultslist');
            this.radiusInput=$(this).find('.radius');
            $(this.radiusInput).numeric({negative : false, decimal : false});
            this.classInput=$(this).find('.class');
        }
    }
   );
};

/**
 * The app object.
 */
var app = app || {};

/**
 * Handler for browser history events.
 */
onpopstate = function(event) {
    app.setupPage(event.state);
};
 
 
/**
 * Sets up the page based on the query history token. 
 */
app.setupPage = function(query) {
    // NOOP
};
 
app.urlParams = {};

app._getNormalizedCoord = function(coord, zoom) {
    var y = coord.y,
        x = coord.x,
        tileRange = 1 << zoom;
    // don't repeat across y-axis (vertically)
    if (y < 0 || y >= tileRange) {
        return null;
    }
    // repeat across x-axis
    if (x < 0 || x >= tileRange) {
        x = (x % tileRange + tileRange) % tileRange;
    }
    return {
        x: x,
        y: y
    };
};
    
/**
 * Immediate function setup.
 */
app.init = function () {
    var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&=]+)=?([^&]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
        q = window.location.search.substring(1);

    // Parses URL parameters:
    while ((e = r.exec(q))) {
        app.urlParams[d(e[1])] = d(e[2]);
    }
    
    var queryPlaceholder = "puma",
        latlng = new google.maps.LatLng(-10, -80);


    app.mapOptions = {
        mapTypeId: google.maps.MapTypeId.TERRAIN,
        center: latlng
    };
    app.map = new google.maps.Map(document.getElementById("map_canvas"), app.mapOptions);
    app.map.setZoom(4);
    app.loadingImg = $('<div id="loader"><img id="loadgif" src="/js/loading.gif"/><span id="loadcount"></span></div>'); 
    app.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(app.loadingImg[0]);
    app.loadingImg.hide();

    app.clearButton = $('<button id="clearMapButton">Clear Polygons</button>'); 
    app.clearButton.click(
        function(event) {
            app.polygon.setMap(null);
            app.infowin.close();
        }
    );

    app.map.controls[google.maps.ControlPosition.TOP_CENTER].push(app.clearButton[0]);

    app.infowin = new google.maps.InfoWindow();

    // Earth Engine intersection count in info window on mouse click:
    google.maps.event.addListener(
        app.map, 
        'click', function(event) {
            app.loadingImg.show();
            app.infowin.close();
            $.post(
                '/earthengine/pointval',
                'll=' + event.latLng.toUrlValue(),
                function(data) {  
                    var ic = JSON.parse(data)['points'][0]['bands']['intersectionCount'][0];

                    app.infowin.setContent('Intersection count: ' + ic);
                    app.infowin.setPosition(event.latLng);
                    app.infowin.open(app.map);
                    app.loadingImg.hide();
                }
            );
        }
    );

    // Earth Engine image overlay map tiles:
    $.post(
        '/earthengine/mapid', 
        '',
        function (data) {
            var mapid = JSON.parse(data)['mapid'],
                token = JSON.parse(data)['token'],
                EARTH_ENGINE_TILE_SERVER = 'http://earthengine.googleapis.com/map/';
            
            app.map.overlayMapTypes.push(
                new google.maps.ImageMapType(
                    {
                        getTileUrl: function(coord, zoom) {
                            return EARTH_ENGINE_TILE_SERVER + mapid + "/"+ zoom + "/"+ coord.x + "/" + coord.y +"?token=" + token;
                        },
                        tileSize: new google.maps.Size(256, 256),
                        isPng: true
                    }
                )
            );
        }
    );

    // Drawing manager for polygons
    app.drawingManager = new google.maps.drawing.DrawingManager(
        {
            drawingMode: null,
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [
                    google.maps.drawing.OverlayType.POLYGON
                ]
            },
            markerOptions: {
                icon: 'images/beachflag.png'
            },
            polygonOptions: {
                fillColor: '#ffff00',
                fillOpacity: .5,
                strokeWeight: 0,
                clickable: false,
                editable: true,
                zIndex: 1
            }
        }
    );
    app.drawingManager.setMap(app.map);

    // Calculate Earth Engine stats for a polygon.
    google.maps.event.addListener(
        app.drawingManager, 
        'polygoncomplete', 
        function(polygon) {

            // TODO: wire in stat updates when polygon edited
            google.maps.event.addListener(polygon.getPath(), 'set_at', function(data){console.log('hi');});

            app.loadingImg.show();
            app.coordinates = [[]];
            polygon.getPath().forEach(
                function(latLng) {
                   app.coordinates[0].push([latLng.lng(), latLng.lat()]);
                }
            );
            app.polygon = polygon;
            app.loadingImg.show();
            app.infowin.close();
            $.post(
                '/earthengine/pointstats',
                'coordinates=' + JSON.stringify(app.coordinates),
                function(data) {  
                    var stats = JSON.stringify(data, undefined, 2),
                        point = app.coordinates[0][0],
                        latlng = new google.maps.LatLng(point[1], point[0]);
                    app.infowin.setContent('Stats: ' + data);
                    app.infowin.setPosition(latlng);
                    app.infowin.open(app.map);
                    app.loadingImg.hide();
                }
            );
        }

    );
    
};
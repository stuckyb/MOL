"""This module contains a tile cache handler."""

__author__ = 'Aaron Steele'

# MOL imports
import cache

# Standard Python imports
import logging
import os
import urllib
import webapp2

# Google App Engine imports
from google.appengine.api import urlfetch
from google.appengine.ext.webapp.util import run_wsgi_app

if 'SERVER_SOFTWARE' in os.environ:
    PROD = not os.environ['SERVER_SOFTWARE'].startswith('Development')
else:
    PROD = True

app_id = os.environ['CURRENT_VERSION_ID'].split('.')[0]
if PROD:
    app_host = 'http://%s.map-of-life.appspot.com' % app_id
else:
    app_host = 'http://localhost:8080'

class TileHandler(webapp2.RequestHandler):
    """Request handler for cache requests."""

    def get(self):
        tile_url = self.request.url.replace(app_host, 'http://mol.cartodb.com')
        tile_png = cache.get(tile_url, value_type='blob')
        if not tile_png:
            tile_png = urlfetch.fetch(tile_url, deadline=60).content
            cache.add(tile_url, tile_png, value_type='blob')
        self.response.headers["Content-Type"] = "image/png"
        self.response.out.write(tile_png)

class GridHandler(webapp2.RequestHandler):
    """Request handler for cache requests."""

    def get(self):
        grid_url = self.request.url.replace(app_host, 'http://mol.cartodb.com')
        grid_json = cache.get(grid_url)
        if not grid_json:
            grid_json = urlfetch.fetch(grid_url, deadline=60).content
            cache.add(grid_url, grid_json)
        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(grid_json)                    
                    
application = webapp2.WSGIApplication(
    [('/tiles/[a-zA-Z0-9_-]+/[\d]+/[\d]+/[\d]+.png?.*', TileHandler),
     ('/tiles/[a-zA-Z0-9_-]+/[\d]+/[\d]+/[\d]+.grid.json?.*', GridHandler),], 
    debug=True)
         
def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()

"""This module contains a cache handler."""

__author__ = 'Aaron Steele'

# MOL imports
import cache
import molcounter

# Standard Python imports
import json
import logging
import urllib
import webapp2

# Google App Engine imports
from google.appengine.api import urlfetch
from google.appengine.ext.webapp.util import run_wsgi_app

api_key = 'putkeyhere'
sql = "INSERT INTO userdata \
    (userid, scientificname, seasonality, the_geom, the_geom_webmercator) \
    VALUES( \
        '%s', \
        '%s', \
        '%s', \
        ST_SetSRID(ST_GeomFromText('%s'),4326), \
        ST_SetSRID(ST_GeomFromText('%s'),3857)"
class PutHandler(webapp2.RequestHandler):
    """Request handler for cache requests."""
    def post(self):
        url = 'http://mol.cartodb.com/api/v2/sql?%s' % urllib.urlencode(dict(q=sql))
        value = urlfetch.fetch(url, deadline=60).content
            if not json.loads(value).has_key('error') and not cache_buster:
                cache.add(key.lower(), value)
        self.response.headers["Cache-Control"] = "max-age=2629743" # Cache 1 month
        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(value)

application = webapp2.WSGIApplication(
    [('/userdata/put', PutHandler),],
    debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()

"""This module contains a handler for proxying the GBIF Occurrences API."""

__author__ = 'Jeremy Malczyk'

# MOL imports
import cache

# Standard Python imports
import json
import logging
import urllib
import webapp2

# Google App Engine imports
from google.appengine.api import memcache
from google.appengine.api import urlfetch
from google.appengine.ext.webapp.util import run_wsgi_app

class eolflag_handler(webapp2.RequestHandler):
    """Request handler for cache requests."""

    def get(self):
        self.post()

    def post(self):

        good = self.request.get('good')
        scientificname = self.request.get('scientificname')
        key = self.request.get('key')
        sql = "UPDATE eol SET good=%s where scientificname='%s'" % (good, scientificname)
        sqlapi_url = 'http://mol.cartodb.com/api/v2/sql?api_key=%s&%s' % (key, urllib.urlencode(dict(q=sql)))
        result = urlfetch.fetch(sqlapi_url, deadline=60).content
        self.response.out.write(result)

application = webapp2.WSGIApplication(
    [('/eolflag/setflag', eolflag_handler)],
    debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()

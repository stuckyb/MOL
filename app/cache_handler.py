"""This module contains a cache handler."""

__author__ = 'Aaron Steele'

# MOL imports
import cache

# Standard Python imports
import json
import logging
import urllib
import webapp2

# Google App Engine imports
from google.appengine.api import urlfetch
from google.appengine.ext.webapp.util import run_wsgi_app

class GetHandler(webapp2.RequestHandler):
    """Request handler for cache requests."""

    def post(self):
        """Returns a cached value by key or None if it doesn't exist."""
        key = self.request.get('key', 'empty')
        sql = self.request.get('sql', None)
        cache_buster = self.request.get('cache_buster', False)
        value = cache.get(key)
        if not value and sql or cache_buster:
            url = 'http://mol.cartodb.com/api/v2/sql?%s' % urllib.urlencode(dict(q=sql))
            value = urlfetch.fetch(url, deadline=60).content
            if not json.loads(value).has_key('error') and not cache_buster:
                cache.add(key, value)
        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(value)

application = webapp2.WSGIApplication(
    [('/cache/get', GetHandler),],
    debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()

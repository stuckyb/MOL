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
from google.appengine.api import memcache
from google.appengine.api import urlfetch
from google.appengine.ext.webapp.util import run_wsgi_app

class ResultsHandler(webapp2.RequestHandler):
    """Request handler for cache requests."""

    def get(self):
        self.post()

    def post(self):
        """Returns a cached value by key or None if it doesn't exist."""
        names = self.request.get('names').split(',')
        results = {}
        for name in names:
            key = 'latin-%s' % name
            value = memcache.get(key)
            if value:
                logging.info('memcache value: %s' % value)
            else:
                value = cache.get(key, loads=True)
                logging.info('cache value: %s' % value)
                memcache.add(key, value)
            results[name] = value
        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(json.dumps(results))

application = webapp2.WSGIApplication(
    [('/cartodb/results', ResultsHandler),],
    debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()

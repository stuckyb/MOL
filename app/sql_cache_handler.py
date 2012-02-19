"""This module contains a cache for CartoDB SQL API responses. The cache key is
the full CartoDB SQL API request URL. The cache value is the unmodified
CartoDB response.

Note: This module requires App Engine SDK 0.9.6 or later since it uses the 
NDB API (google.appengine.ext.ndb).
"""

__author__ = 'Aaron Steele'

# Standard Python imports
import logging
import simplejson

# Google App Engine imports
from google.appengine.api import urlfetch
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext.ndb import model

class CacheEntry(model.Model): # id=key
    """The cache entry."""

    value = model.StringProperty('v', indexed=False)
    created = model.DateTimeProperty('c', auto_now_add=True)

    @classmethod
    def get_key(cls, keyname):
        """Returns a CacheEntry.Key for the given keyname."""
        return model.Key('CacheEntry', keyname)

    @classmethod
    def getit(cls, keyname):
        """Gets a CacheEntry by keyname."""
        return cls.get_key(keyname).get()

    @classmethod
    def putit(cls, keyname, value):
        """Puts a new CacheEntry with the given keyname and value."""
        cls(key=cls.get_key(keyname), value=value).put()

class GetHandler(webapp.RequestHandler):
    """Request handler for cache requests."""

    def get(self):
        self.post()

    def post(self):
        """Returns a CacheEntry value for a key parameter. If the key isn't found,,
        a request is made to CartoDB and the response is cached and returned.
        """

        key = self.request.get('key', None)
        if not key:
            logging.error('Missing key parameter')
            return
        entry = CacheEntry.getit(key)        
        if not entry:
            logging.info('No CacheEntry found for key=%s' % key)
            value = self.query(key)
            logging.info('Add CacheEntry %s=%s' % (key, value))
            CacheEntry.putit(key, value)
        else:
            value = entry.value
        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(value)

    def query(self, key):
        """Queries CartoDB using the given key (which is a full API request URL)."""
        result = urlfetch.fetch(key)
        return result.content
        
class PutHandler(webapp.RequestHandler):
    def post(self):
        # TODO: require login
        key = self.request.get('key', None)
        value = self.request.get('value', None)
        if not key and not value:
            logging.error('The key and value parameters are both required')
            return
        logging.info('Putting %s=%s' % (key, value))
        CacheEntry.putit(key, value)
            
application = webapp.WSGIApplication(
    [('/cache/sql/get', GetHandler),], 
    debug=True)
         
def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()

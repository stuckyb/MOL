"""This module contains a cache for CartoDB SQL API responses. The cache key is
the full CartoDB SQL API request URL. The cache value is the unmodified
CartoDB response.

Note: This module requires App Engine SDK 0.9.6 or later since it uses the 
NDB API (google.appengine.ext.ndb).
"""

__author__ = 'Aaron Steele'

# Standard Python imports
import logging

# Google App Engine imports
from google.appengine.api import urlfetch
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext.ndb import model

class SqlCacheEntry(model.Model): # id=key
    """The cache entry."""

    value = model.StringProperty('v', indexed=False)
    created = model.DateTimeProperty('c', auto_now_add=True)

    @classmethod
    def get_key(cls, keyname):
        """Returns a SqlCacheEntry.Key for the given keyname."""
        return model.Key('SqlCacheEntry', keyname)

    @classmethod
    def getit(cls, keyname):
        """Gets a SqlCacheEntry by keyname."""
        return cls.get_key(keyname).get()

    @classmethod
    def putit(cls, keyname, value):
        """Puts a new SqlCacheEntry with the given keyname and value."""
        cls(key=cls.get_key(keyname), value=value).put()

class SqlCache(object):

    @classmethod
    def get(cls, key):
        """Returns a SqlCacheEntry value for a key parameter. If the key isn't found,,
        a request is made to CartoDB and the response is cached and returned.
        """
        if not key:
            logging.error('Missing key parameter')
            return
        entry = SqlCacheEntry.getit(key)        
        if not entry:
            logging.info('No SqlCacheEntry found for key=%s' % key)
            value = urlfetch.fetch(key).content
            logging.info('Add SqlCacheEntry %s=%s' % (key, value))
            SqlCacheEntry.putit(key, value)
        else:
            value = entry.value
        return value       

"""This module contains a cache that supports string and blob values. It supports
both because blobs are unable to encode unicode characters properly.
"""

__author__ = 'Aaron Steele'

# Standard Python imports
import logging

# Google App Engine imports
from google.appengine.ext.ndb import model

class CacheItem(model.Model):
    """An item in the cache. Supports blob and string cached values since blob
    can't handle unicode characters.
    """
    blob = model.BlobProperty('b') 
    string = model.StringProperty('s', indexed=False) 
    created = model.DateTimeProperty('c', auto_now_add=True)
    
    @classmethod
    def get(cls, key, loads=False, value_type='string'):
        value = None
        item = model.Key(cls.__name__, key.strip().lower()).get()
        if item:            
            if value_type == 'string':
                if loads:
                    value = simplejson.loads(item.string)
                else:
                    value = item.string
            elif value_type == 'blob':
                value = item.blob
        return value

    @classmethod
    def add(cls, key, value, dumps=False, value_type='string'):
        if value_type == 'string':
            if dumps:
                cls(id=key.strip().lower(), string=simplejson.dumps(value)).put()
            else:
                cls(id=key.strip().lower(), string=value).put()
        elif value_type == 'blob':
            cls(id=key.strip().lower(), blob=value).put()
    
def get(key, loads=False, value_type='string'):
    """Gets a cached item value by key.

    Arguments:
        key - The cache item key.
        loads - If true call simplejson.loads() on cached item (default false).
        value_type - The type of cache value (string or blob, default string).
    """
    return CacheItem.get(key, loads, value_type)

def add(key, value, dumps=False, value_type='string'):
    """Adds a value to the cache by key.

    Arguments:
        key - The cache item key.
        value - The cache item value.
        dumps - If true call simplejson.dumps() to value before caching (default false).
        value_type - The type of cache value (string or blob, default string).
    """
    CacheItem.add(key, value, dumps, value_type)

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

class ResultsHandler(webapp2.RequestHandler):
    """Request handler for cache requests."""

    def post(self):
        """Returns a cached value by key or None if it doesn't exist."""
        # names = self.request.get('names').split(',')        
        # value = cache.get(key)
        # if not value and sql:
        #     url = 'http://mol.cartodb.com/api/v2/sql?%s' % urllib.urlencode(dict(q=sql))
        #     value = urlfetch.fetch(url, deadline=60).content
        #     if not json.loads(value).has_key('error'):
        #         cache.add(key, value)
        mock = """{"time":0.01,"total_rows":4,"rows":[{"source":"gbif","source_title":"GBIF","name":"Puma concolor","type":"points","type_title":"Point observation","names":"Puma, Cougar, Deer Tiger, Mountain Lion, Red Tiger","class":"mammalia","feature_count":1363},{"source":"wwf","source_title":"World Wildlife Fund","name":"Puma concolor","type":"ecoregion","type_title":"Regional checklist","names":"Puma, Cougar, Deer Tiger, Mountain Lion, Red Tiger","class":"mammalia","feature_count":202},{"source":"wdpa","source_title":"Scientist provided","name":"Puma concolor","type":"protectedarea","type_title":"Local inventory","names":"Puma, Cougar, Deer Tiger, Mountain Lion, Red Tiger","class":"mammalia","feature_count":92},{"source":"iucn","source_title":"IUCN","name":"Puma concolor","type":"range","type_title":"Expert range map","names":"Puma, Cougar, Deer Tiger, Mountain Lion, Red Tiger","class":"mammalia","feature_count":1}]}"""
        self.response.headers["Content-Type"] = "application/json"        
        self.response.out.write(mock)
                    
application = webapp2.WSGIApplication(
    [('/cartodb/results', ResultsHandler),], 
    debug=True)
         
def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()

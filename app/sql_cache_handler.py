"""This module contains a cache handler for CartoDB SQL API responses."""

__author__ = 'Aaron Steele'

# MOL imports
import cache

# Standard Python imports
import logging

# Google App Engine imports
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class GetHandler(webapp.RequestHandler):
    """Request handler for cache requests."""

    def post(self):
        """Returns a CartoDB SQL API response for a key - the CartoDB SQL API 
        request URL parameter.
        """
        key = self.request.get('key', None)
        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(cache.SqlCache.get(key))
                    
application = webapp.WSGIApplication(
    [('/cache/sql/get', GetHandler),], 
    debug=True)
         
def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()

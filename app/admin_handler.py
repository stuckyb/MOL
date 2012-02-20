"""This module contains request handlers for  admin-only access."""

import datetime
import logging

from google.appengine.api import backends
from google.appengine.api import taskqueue
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class SearchCacheHandler(webapp.RequestHandler):
    def get(self):
        taskqueue.add(
            url='/backend/build_search_cache', 
            queue_name='build-search-cache', 
            eta=datetime.datetime.now(), 
            target='search-cache-builder-backend')            
        logging.info("BOOM")
        self.response.set_status(202) # Accepted

application = webapp.WSGIApplication(
         [('/admin/build-search-cache', SearchCacheHandler)],
         debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()

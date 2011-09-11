# Copyright 2011 Aaron Steele
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

__author__ = "Aaron Steele (eightysteele@gmail.com)"
__contributors__ = []

import cache
import sources

import logging
import os
import simplejson

from google.appengine.api import backends
from google.appengine.api import memcache
from google.appengine.api import taskqueue
from google.appengine.api import urlfetch
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class SearchPoints(webapp.RequestHandler):
    def get(self):
        # Check parameters
        name = self.request.get('name', None)
        if not name:
            self.error(400)
            return
        source_name = self.request.get('source', None)
        
        # Check cache
        key = self.cache_key(name, source_name)
        names = cache.get(key)
        if names:
            self.response.set_status(200)
            self.response.headers['Content-Type'] = "application/json"
            self.response.out.write(names)
            return
        
        source = sources.get(source_name)
        if not source:
            # TODO: Get names from all sources?
            self.error(404)
            return
        
        # Make service request for names
        names, status_code = self.get_names(source, name)        
        if status_code != 200:
            self.error(status_code)
            return
        
        # Update cache and send response
        cache.add(key, names)
        self.response.set_status(200)
        self.response.headers['Content-Type'] = "application/json"
        self.response.out.write(simplejson.dumps(names))
        
    @classmethod
    def cache_key(cls, name, source_name):
        if source:
            return 'points-names-%s-%s' % (name, source_name)
        else:
            return 'points-names-%s' % name        

    @classmethod
    def get_names(cls, source, name):
        result = urlfetch.fetch(source.name_url(name))
        if result.status_code == 200:
            return (source.name_list(result.content), 200)
        else:
            return ([], result.status_code)

class HarvestPoints(webapp.RequestHandler):
    def get(self):
        self.error(405)
        self.response.headers['Allow'] = 'POST'
        return

    def post(self):
        # Check parameters
        name = self.request.get('name', None)
        if not name:
            self.error(400)
            return
        source_name = self.request.get('source', None)

        # Add harvest task that targets harvest backed instance 1
        params = dict(name=name, source=source_name)
        taskqueue.add(url='/backend/harvest', target='1.harvest', params=params)

application = webapp.WSGIApplication([
     ('/frontend/points/search', SearchPoints),
     ('/frontend/points/harvest', HarvestPoints),
     ],
     debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()

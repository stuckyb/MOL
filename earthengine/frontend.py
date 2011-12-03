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

from connector import EarthEngine
from auth_gae import ClientLogin

import datetime
import logging
import os
import simplejson
import urllib

from google.appengine.api import backends
from google.appengine.api import memcache
from google.appengine.api import taskqueue
from google.appengine.api import urlfetch
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext.webapp import template

email, passwd = open('auth.txt').read().split(',')
token = ClientLogin().authorize(email, passwd)
proxy = EarthEngine(token)

class Home(webapp.RequestHandler):
    def get(self):
        template_values = dict(token='hi', limit=10, offset=0)
        self.response.out.write(template.render('index.html', template_values))

class GetPointStats(webapp.RequestHandler):
    def post(self):
        tableid = self.request.get('tableid') or 2191296
        coordinates = self.request.get('coordinates')        
        logging.info(coordinates)        
        image = """{"creator":"MOL/com.google.earthengine.examples.polyintersect.GetStats","args":[{"creator":"MOL/com.google.earthengine.examples.polyintersect.CountPolygonIntersect","args":[{"type":"FeatureCollection","table_id":%s}]},"intersectionCount",{"features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":%s}}]}]}""" % (tableid, coordinates)
        query = dict(
            image=image,
            fields='stats')
        url = '/value?%s' % urllib.urlencode(query)
        logging.info(query)
        response = proxy.get(url)
        logging.info(response)
        self.response.out.write(simplejson.dumps(response['data']))        
        
class GetPointVal(webapp.RequestHandler):
    def post(self):
        tableid = self.request.get('tableid') or 2191296
        lat, lng = [float(x) for x in self.request.get('ll').split(',')]
        query = dict(
                        image=simplejson.dumps(
                {
                    "creator":"MOL/com.google.earthengine.examples.polyintersect.CountPolygonIntersect",
                    "args":[
                        {
                            "type":"FeatureCollection",
                            "table_id":int(tableid)
                            }
                        ]
                    }
                ),
                bands="intersectionCount",
                points=[[lng, lat]])
        url = '/value?%s' % urllib.urlencode(query)
        response = proxy.get(url)
        self.response.out.write(simplejson.dumps(response['data']))        
    
class GetMapId(webapp.RequestHandler):
    def post(self):
        tableid = self.request.get('tableid') or 2191296
        query = dict(
            image=simplejson.dumps(
                {
                    "creator":"MOL/com.google.earthengine.examples.polyintersect.CountPolygonIntersect",
                    "args":[
                        {
                            "type":"FeatureCollection",
                            "table_id":int(tableid)
                            }
                        ]
                    }
                ),
            bands="intersectionCount",
            min=1,
            max=32)
        url = '/mapid?%s' % urllib.urlencode(query)
        response = proxy.get(url)
        self.response.out.write(simplejson.dumps(response['data']))

application = webapp.WSGIApplication([
        ('/earthengine$', Home),
        ('/earthengine/mapid', GetMapId),
        ('/earthengine/pointval', GetPointVal),
        ('/earthengine/pointstats', GetPointStats),
        ], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()

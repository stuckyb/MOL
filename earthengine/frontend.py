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
__contributors__ = ["Dave Thau (thau@google.com)"]

# App Engine imports.
from google.appengine.api import memcache
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext.webapp import template

# Earth Engine imports.
from connector import EarthEngine
from auth_gae import ClientLogin

# Standard Python imports.
import datetime
import logging
import os
import simplejson
import sys
import urllib

# Authenticate for Earth Engine token.
email, passwd = open('auth.txt').read().split(',')
token = ClientLogin().authorize(email, passwd)
proxy = EarthEngine(token)

class EarthEngineRequest(object):

    """Base class for Earth Engine requests."""

    def execute(self, post=False):
        """Executes the request and returns the response object."""
        if post:
            return proxy.post(self.get_path(), params=self.get_query())
        return proxy.get(self.get_url())

class MapIdRequest(EarthEngineRequest):

    """This class encapsulates a /mapid request to Earth Engine.

    When executed, this request returns a mapid and token that can be used to
    create tile URLs for tiling a Fusion Table table on a Google Map.
    """

    def __init__(self, tableid, min_intersect=1, max_intersect=32):
        """Creates a new MapIdRequest object.

        Args:
            tableid - The Fusion Table table id.
            min_intersect - The min number of polygons to intersect.
            max_intersect - The max number of polygons to intersect.
        """
        self.tableid = tableid
        self.min_intersect = min_intersect
        self.max_intersect = max_intersect

    def get_url(self):
        """Returns the URL for this request."""
        image = dict(
            creator='MOL/com.google.earthengine.examples.mol.CountPolygonIntersect',
            args=[dict(type='FeatureCollection', table_id=self.tableid)])
        query = dict(
            image=simplejson.dumps(image),
            bands="intersectionCount",
            min=self.min_intersect,
            max=self.max_intersect)
        url = '/mapid?%s' % urllib.urlencode(query)
        return url

class IntersectRequest(EarthEngineRequest):
        
    """This class encapsulates a /value request to Earth Engine.

    When executed, this request returns the number of polygons that intersect
    at a point. Note that polygons can be stored in multiple Fusion Tables to 
    get around the 100k row limit on spatial queries. 
    """

    def __init__(self, tableids, lat, lng):
        """Creates a new IntersectRequest object.

        Args:
            tableids - The list of Fusion Table table ids.
            lat - The decimal latitude.
            lng - The decimal longitude.
        """
        self.tableids = tableids
        self.lat = lat
        self.lng = lng

    def get_query(self, urlencode=True):
        creators = [self.get_creator(x) for x in self.tableids]
        image = dict(
            creator='MOL/com.google.earthengine.examples.mol.SumImages',
            args=[creators])
        query = dict(
            image=simplejson.dumps(image),
            bands='intersectionCount',
            points=simplejson.dumps([[self.lng, self.lat]]))
        logging.info(query)
        if urlencode:
            return urllib.urlencode(query)
        return query
    
    def get_path(self):
        return '/value'

    def get_url(self):
        """Returns the URL for this request."""
        url = '%s?%s' % (self.get_path(), self.get_query())
        return url

    def get_creator(self, tableid):
        """Returns a creator object for a Fusion Table table id."""
        return dict(
            creator="MOL/com.google.earthengine.examples.mol.CountPolygonIntersect",
            args=[dict(type='FeatureCollection', table_id=tableid)])
    

class StatsRequest(EarthEngineRequest):
        
    """This class encapsulates a /value request to Earth Engine for stats.

    When executed, this request returns stats for a single polygon on a single
    Fusion Table.
    """

    def __init__(self, tableids, coordinates, lat, lng):
        """Creates a new StatsRequest object.

        Args:
            tableids - The list of Fusion Table table ids.
            coordinates - The list of coordinates representing the polygon.
            lat - The center latitude of the polygon.
            lng - The center longitude of the polygon.
        """
        self.tableids = tableids
        self.coordinates = simplejson.loads(coordinates)
        self.lat = lat
        self.lng = lng

    def get_url(self):
        """Returns the URL for this request."""
        creators = [self.get_creator(x) for x in self.tableids]
        image = dict(
           creator='MOL/com.google.earthengine.examples.mol.GetSpeciesArea',
           args=[dict(type='FeatureCollection', table_id=self.tableids[0]),
                 self.lng,
                 self.lat,
                 self.coordinates])
        query = dict(
            image=simplejson.dumps(image),
            fields='areas')
        url = '/value?%s' % urllib.urlencode(query)
        return url
    
    def get_creator(self, tableid):
        """Returns a creator object for a Fusion Table table id."""
        return dict(
            creator="MOL/com.google.earthengine.examples.mol.CountPolygonIntersect",
            args=[dict(type='FeatureCollection', table_id=tableid)])

class SpeciesNamesListRequest(EarthEngineRequest):
        
    """This class encapsulates a /value request to Earth Engine for species names.

    When executed, this request returns stats for a single polygon on one or many
    Google Fusion Tables.
    """

    def __init__(self, tableids, coordinates):
        """Creates a new StatsRequest object.

        Args:
            tableids - The list of Fusion Table table ids.
            coordinates - The list of coordinates representing the polygon.
            lat - The center latitude of the polygon.
            lng - The center longitude of the polygon.
        """
        self.tableids = tableids
        self.coordinates = simplejson.loads(coordinates)[0]
        logging.info(self.coordinates)

    def get_url(self):
        """
        table={"algorithm":"FilterFeatureCollection","collection":{"table_id":2378062},"filters":[{"boundary":[[6.35,47.5],[6.35,46.2],[30.0,46.2],[30.0,47.5]]}]}&selectors=Latin
        """
        table = dict(
            algorithm = "FilterFeatureCollection",
            collection = dict(table_id = self.tableids[0]),
            filters = [dict(boundary = self.coordinates)])
        
        logging.info(table)

        query = dict(
            table = simplejson.dumps(table),
            selectors = "Latin")
        
        url = '/table?%s' % urllib.urlencode(query)
        return url

class MergeFeatureCollection(EarthEngineRequest):
        
    """This class encapsulates a /table request to Earth Engine for species names.

    When executed, this request returns species names for a single polygon on one 
    or many Google Fusion Tables. There are duplicates so we need to find uniques.
    """

    def __init__(self, tableids, coordinates):
        """Constructor.

        Args:
            tableids - The list of Fusion Table table ids.
            coordinates - The list of coordinates representing the polygon.
        """
        self.tableids = tableids
        self.coordinates = simplejson.loads(coordinates)[0]

    def get_url(self):
        table = dict(
            algorithm = "FilterFeatureCollection",
            filters = [dict(boundary = self.coordinates)])
        
        # Throttled to 3 tables max for now:
        count = len(self.tableids)
        if count > 0:
            tableid = self.tableids.pop()
            if tableid:
                table['collection'] = self.get_collection(tableid)        
                
        if count > 1:
            tableid = self.tableids.pop()
            if tableid:
                table['collection']['collection2'] = self.get_collection(tableid)

        if count > 2:
            tableid = self.tableids.pop()
            if tableid:
                table['collection']['collection2']['collection2'] = dict(table_id= tableid)

        query = dict(
            table = simplejson.dumps(table),
            selectors = "Latin")
        
        logging.info('query: %s' % query)

        url = '/table?%s' % urllib.urlencode(query)
        return url

    def get_collection(self, tableid):
        return dict(
            algorithm = "MOL/com.google.earthengine.examples.mol.MergeFeatureCollection",
            collection1 = dict(table_id = tableid))
           
class Home(webapp.RequestHandler):
    
    """Handler that renders the home page from a template."""

    def get(self):
        template_values = dict(token='hi', limit=10, offset=0)
        self.response.out.write(template.render('index.html', template_values))

class StatsHandler(webapp.RequestHandler):
    
    """Handler for /stats requests. 

    Params:
        tableids - A CSV string of table ids.
        coordinates - The coordinates string.
        center - The lat,lng center of the polygon.

    Returns the Earth Engine request and response as JSON.
    """    

    def post(self):
        tableids = [int(x) for x in self.request.get('tableids').split(',')]
        coordinates = self.request.get('coordinates')
        lat, lng = [float(x) for x in self.request.get('center').split(',')]
        request = StatsRequest(tableids, coordinates, lat, lng)
        response = request.execute()
        payload = dict(request=request.get_url(), response=response)
        self.response.out.write(simplejson.dumps(payload))

class SpeciesNamesListHandler(webapp.RequestHandler):
    
    """Handler for /names requests.

    Params:
        tableids - A CSV string of table ids.
        coordinates - The coordinates string.

    Returns the Earth Engine request and response as JSON.
    """    

    def post(self):
        logging.info("HIII?")
        tableids = [int(x) for x in self.request.get('tableids').split(',')]
        coordinates = self.request.get('coordinates')
        request = MergeFeatureCollection(tableids, coordinates)
        response = request.execute()   

        if response.has_key('error'):
            self.response.out.write(simplejson.dumps(response))
            logging.info('ERROR: %s' % response) 
            return
        
        uniques = list(set([name[0] for name in response['data']['rows']]))
        uniques.sort()
        response['data']['names'] = dict(count = len(uniques), names = uniques)
        payload = dict(request=request.get_url(), response=response)
        self.response.out.write(simplejson.dumps(payload))
        
class IntersectHandler(webapp.RequestHandler):

    """Handler for /intersect requests. 

    Params:
        tableids - A CSV string of table ids.
        ll - The lat and lng separated by a comma.

    Returns the Earth Engine request and response as JSON.
    """    

    def post(self):
        """Proxies a /val request to Earth Engine."""
        tableids = [int(x) for x in self.request.get('tableids').split(',')]
        lat, lng = [float(x) for x in self.request.get('ll').split(',')]
        request = IntersectRequest(tableids, lat, lng)
        response = request.execute(post=True)
        payload = dict(request=request.get_url(), response=response)
        self.response.out.write(simplejson.dumps(payload))
    
class MapIdHandler(webapp.RequestHandler):

    """Handler for /mapid requests. 

    Params:
        tableids - A CSV string of table ids.
        min - The min number of intersections.
        max - The max number of intersection.

    Returns the Earth Engine request and response as JSON.
    """    
    def post(self):
        """Proxies a /mapid request to Earth Engine."""
        tableids = [int(x) for x in self.request.get('tableids').split(',')]
        mn = self.request.get_range('min', default=1)
        mx = self.request.get_range('max', default=32)
        payload = []
        for tableid in tableids:
            request = MapIdRequest(tableid, min_intersect=mn, max_intersect=mx)
            response = request.execute()
            response['data']['tableid'] = tableid
            payload.append(dict(request=request.get_url(), response=response))
        self.response.out.write(simplejson.dumps(payload))

application = webapp.WSGIApplication([
        ('/earthengine$', Home),
        ('/earthengine/mapid', MapIdHandler),
        ('/earthengine/intersect', IntersectHandler),
        ('/earthengine/stats', StatsHandler),
        ('/earthengine/names', SpeciesNamesListHandler),
        ], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()

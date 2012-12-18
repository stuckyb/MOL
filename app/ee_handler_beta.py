from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app


import os
import ee
import webapp2
import httplib2
import urllib
import logging
from google.appengine.api import urlfetch

import json
from oauth2client.appengine import AppAssertionCredentials

#Global variables
EE_URL = 'https://earthengine.googleapis.com'
CDB_URL = 'http://mol.cartodb.com/api/v2/sql'

# The OAuth scope URL for the Google Earth Engine API.
GEE_SCOPE = 'https://www.googleapis.com/auth/earthengine.readonly'
SCOPES = (GEE_SCOPE)
credentials = AppAssertionCredentials(scope=SCOPES)


class MainPage(webapp2.RequestHandler):
    def render_template(self, f, template_args):
        path = os.path.join(os.path.dirname(__file__), "templates", f)
        self.response.out.write(template.render(path, template_args))

    def get(self):
        
        ee.Initialize(credentials, EE_URL)
      
        sciname = self.request.get('sciname', None)
        habitats = self.request.get('habitats', None)
        elevation = self.request.get('elevation', None) 
        provider = self.request.get('provider', None)
        provider = self.request.get('type', None)
        dataset_id = self.request.get('dataset_id', None)
        
        #Grab kml and spit it into FT
        sql = "SELECT * FROM get_kml('%s','%s','%s','%s')"  % (provider, type, sciname, dataset_id)
        url = 'http://mol.cartodb.com/api/v2/sql?%s' % urllib.urlencode(dict(q=sql))
        value = urlfetch.fetch(url, deadline=60).content
        
        result = json.loads(value)
        rows = result["rows"]
        
        #create the new table
        h = Http()
        data = '''{  
             "name": "MOL Polygon Data",
             "columns": [
              {
               "name": "scientificname",
               "type": "STRING"
              },
              {
               "name": "geom",
               "type": "GEOMETRY"
              },
              {
               "name": "type",
               "type": "STRING"
              },
              {
               "name": "provider",
               "type": "STRING"
              },
              {
               "name": "dataset_id",
               "type": "STRING"
              }
             ],
             "description": "A MOL polygon cache item.",
             "isExportable": true
             }'''
        response, content = h.request("https://www.googleapis.com/fusiontables/v1/tables?api") 
        
        for row in rows:
            url = 
        
        #species = ee.FeatureCollection(geom["rows"][0]["geojson"])
         
        #Get land cover and elevation layers
        cover = ee.Image('MCD12Q1/MCD12Q1_005_2001_01_01').select('Land_Cover_Type_1')
        elev = ee.Image('srtm90_v4')

        output = ee.Image(0)
        species = ee.FeatureCollection('ft:1ugWA45wi7yRdIxKAEbcfd1ks8nhuTcIUyx1Lv18').filter(ee.Filter().eq('Latin',sciname))
        
        #parse the CDB response

        min = int(elevation.split(',')[0])
        max = int(elevation.split(',')[1])
        habitat_list = habitats.split(",")

        for pref in habitat_list:
            output = output.where(cover.eq(int(pref)).And(elev.gt(min)).And(elev.lt(max)).clip(species),1)

        result = output.mask(output)
        mapid = result.getMapId({'palette': 'FF0000'})
        template_values = {
            'mapid' : mapid['mapid'],
            'token' : mapid['token']
        }
        
        self.render_template('ee.js', template_values)

application = webapp2.WSGIApplication([ ('/', MainPage), ('/.*', MainPage) ], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()

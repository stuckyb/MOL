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
        year = self.request.get('year', None)

        #Grab geojson
        #sql = "SELECT ST_AsGeoJson(ST_Transform(the_geom_webmercator,4326)) as geojson FROM jetz_maps where latin='%s'"  % (sciname)
        #url = 'http://mol.cartodb.com/api/v2/sql?%s' % urllib.urlencode(dict(q=sql))
        #value = urlfetch.fetch(url, deadline=60).content


        #geojson = ee.FeatureCollection(geom["rows"][0]["geojson"])
        #sql = 'INSERT INTO '
        #url = ''


        #Get land cover and elevation layers
        cover = ee.Image('MCD12Q1/MCD12Q1_005_%s_01_01' % (year)).select('Land_Cover_Type_1')
        elev = ee.Image('srtm90_v4')

        output = ee.Image(0)
        #species = ee.FeatureCollection('ft:1ugWA45wi7yRdIxKAEbcfd1ks8nhuTcIUyx1Lv18').filter(ee.Filter().eq('Latin',sciname))
        species = ee.FeatureCollection('ft:1qJV-TVLFM85XIWGbaESWGLQ1rWqsCZuYBdhyOMg').filter(ee.Filter().eq('Latin',sciname))
        species_image = ee.Image(0).toByte().paint(species,255)
        #parse the CDB response

        min = int(elevation.split(',')[0])
        max = int(elevation.split(',')[1])
        habitat_list = habitats.split(",")

        for pref in habitat_list:
            output = output.where(cover.eq(int(pref)).And(elev.gt(min)).And(elev.lt(max)),1)

        result = output.mask(species_image)
        mapid = species_image.getMapId({min: 0, max: 255, 'palette': 'FF0000'})
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

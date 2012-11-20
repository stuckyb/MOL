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
        
        sql = "SELECT * FROM elevandhabitat e JOIN specieslist s ON e.scientific = s.latin WHERE s.latin = '%s'" % (sciname)
        url = 'http://mol.cartodb.com/api/v2/sql?%s' % urllib.urlencode(dict(q=sql))
        value = urlfetch.fetch(url, deadline=60).content
        
        cover = ee.Image('MCD12Q1/MCD12Q1_005_2001_01_01').select('Land_Cover_Type_1');
        elev = ee.Image('srtm90_v4');
        output = ee.Image(0)
        species = ee.FeatureCollection('ft:1ugWA45wi7yRdIxKAEbcfd1ks8nhuTcIUyx1Lv18').filter(ee.Filter().eq('Latin',sciname))
        Image1 = ee.Image(0).mask(0)
        Image1 = Image1.rgb(255,255,255)
        
        val = json.loads(value)
        
        #self.response.out.write(json.dumps(speciesInfo))
        speciesInfo = val["rows"][0]
        logging.info(json.dumps(speciesInfo))
        
        min = speciesInfo["finalmin"]
        max = speciesInfo["finalmax"]
        habitat_list = speciesInfo["habitatprefs"].split(",")
        
        for pref in habitat_list:
             output = output.where(cover.eq(int(pref)).And(elev.gt(int(min))).And(elev.lt(int(max))).clip(species))
        
        result = output.mask(output)
        
        result = result.rgb(255,0,0)
        
        mapit = Image1.cat(result)

        
        mapid = mapit.getMapId({'min':0, 'max':1000})
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
"""One-line documentation for biomass module.

A detailed description of biomass.
"""

import os
import ee
import webapp2
import jinja2
import httplib2
from oauth2client.appengine import AppAssertionCredentials

jinja_environment = jinja2.Environment(
        loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))

#Global variables
EE_URL = 'https://earthengine.googleapis.com'

# The OAuth scope URL for the Google Earth Engine API.
GEE_SCOPE = 'https://www.googleapis.com/auth/earthengine.readonly'
SCOPES = (GEE_SCOPE)
credentials = AppAssertionCredentials(scope=SCOPES)

class MainPage(webapp2.RequestHandler):
    def get(self):

      ee.Initialize(credentials, EE_URL)
      mapid = ee.Image('srtm90_v4').getMapId({'min':0, 'max':1000})

      template_values = {
          'mapid' : mapid['mapid'],
          'token' : mapid['token']
          }
      template = jinja_environment.get_template('ee.json')
      self.response.out.write(template.render(template_values))

app = webapp2.WSGIApplication([ ('/', MainPage) ], debug=True)

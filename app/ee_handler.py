from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

import os
import ee
import webapp2
import httplib2
from oauth2client.appengine import AppAssertionCredentials

#Global variables
EE_URL = 'https://earthengine.googleapis.com'

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
        mapid = ee.Image('srtm90_v4').getMapId({'min':0, 'max':1000})


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
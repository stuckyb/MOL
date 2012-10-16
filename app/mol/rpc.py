"""This module contains the RPC request handler."""

from mol import mps
from mol import service

from goog.ndb_json import encode as dumps

import json
import logging
import webapp2

from google.appengine.ext.webapp.util import run_wsgi_app

class RpcHandler(webapp2.RequestHandler):
    def get(self):
        self.post()

    def post(self):
        topic = self.request.get('topic')
        data = json.loads(self.request.get('data'))
        user = self.request.user
        service.execute(topic, data, user=user, request=self.request)
        mps.publish(topic, data, user=user, request=self.request)
  
handler = webapp2.WSGIApplication(
    [('/rpc', RpcHandler),],
    debug=True)
         
def main():
    run_wsgi_app(handler)

if __name__ == "__main__":
    main()

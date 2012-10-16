"""This module contains the event bus request handlers."""

from mol import mps

from engineauth.models import User
from goog.ndb_json import encode as dumps

import json
import logging
import uuid
import webapp2

from google.appengine.ext.ndb import GenericProperty
from google.appengine.api import channel
from google.appengine.ext.webapp.util import run_wsgi_app

def fire(event):
    """Fires the supplied JSON event on the bus."""
    for user in User.query().fetch(): 
        for cid in user.client_ids:
            channel.send_message(cid, event)

class BusConnect(webapp2.RequestHandler):
    """Handles the initial channel connected request."""
    def post(self):
        cid = self.request.get('from')
        username = cid.split('-')[0]
        user = User.query(User.username == username).get()
        user.client_ids.append(cid)
        user.put()

class BusDisconnect(webapp2.RequestHandler):
    """Handles the channel disconnected request."""
    def post(self):
        cid = self.request.get('from')
        username = cid.split('-')[0]
        user = User.query(User.username == username).get()
        if cid in user.client_ids:
            user.client_ids.remove(cid)
        user.put()
                   
class BusMessage(webapp2.RequestHandler):
    """Handles a message coming down the channel."""
    def post(self):
        topic = self.request.get('topic')
        data = json.loads(self.request.get('data'))
        user = self.request.user        
        mps.publish(topic, data, user=user)
  
class BusToken(webapp2.RequestHandler):
    """Handles a channel token request."""
    def post(self):
        cid = '%s-%s' % (self.request.user.username, uuid.uuid4().hex)
        token = channel.create_channel(cid)
        self.response.headers["Content-Type"] = "application/json"        
        self.response.out.write('{"token": "%s"}' % token)

handler = webapp2.WSGIApplication(
    [('/bus/token', BusToken),
     ('/bus/message', BusMessage),
     ('/_ah/channel/connected/', BusConnect),
     ('/_ah/channel/disconnected/', BusDisconnect)],
    debug=True)
         
def main():
    run_wsgi_app(handler)

if __name__ == "__main__":
    main()

"""This module contains the chat request handler."""

# Hylo imports
import model

# Standard Python imports
import json
import logging
import re
import webapp2
import datetime

# Google App Engine imports
from google.appengine.api import channel
from google.appengine.api import mail
from google.appengine.api import memcache
from google.appengine.ext import ndb
from google.appengine.api import users
from google.appengine.ext.webapp.util import run_wsgi_app

__all__ = ['get_commands', 'gmail_from_mention', 'get_mentions', 'get_emails']

MENTIONS = re.compile("@\w+")
COMMANDS = re.compile("@[a-zA-Z0-9.]*/\w+")

def get_commands(message):
  """@sanderpick/collab => {@sanderpick: collab}"""
  commands = {}
  for command in COMMANDS.findall(message):
    mention, action = command.split('/')
    commands[mention] = action
  logging.info("COMMANDS %s" % commands)
  return commands    

def gmail_from_mention(mentions):
  """Return list of gmail addresses from list of @mentions."""
  return ['%s@gmail.com' % x[1:] for x in mentions]

def get_mentions(message):
  """Return user names for anyone mentioned in a chat message."""
  return [x.split('@')[0] for x in MENTIONS.findall(message)]

def get_emails(mentions, emails):
  """Returns the email for supplied mention by comparing to list of emails."""
  results = []
  for mention in mentions:
    for email in emails:
      if email.startswith(mention):
        results.append(email)
  return results

class UserConnection(ndb.Model):
    """The UserConnection datastore model."""
    connected = ndb.BooleanProperty('x', default=False)
    created = ndb.DateTimeProperty('c', auto_now_add=True)
    updated = ndb.DateTimeProperty('e', auto_now=True)

    @classmethod
    def get_or_create(cls, email):
      key = ndb.Key('UserConnection', email.lower())
      uc = key.get()
      if not uc:
        uc = cls(key=key)
        uc.put()
      return uc

class ClientConnect(webapp2.RequestHandler):
  def post(self):
    email = self.request.get('from')
    uc = UserConnection.get_or_create(email)
    uc.connected = True
    uc.put()
    # logging.info('%s connected' % uc)

class ClientDisconnect(webapp2.RequestHandler):
  def post(self):
    email = self.request.get('from')
    uc = UserConnection.get_or_create(email)
    uc.connected = False
    uc.put()
    # logging.info('%s disconnected' % uc)
                   
class ChatMessage(webapp2.RequestHandler):
  """Handler for chat messages."""

  def send_email(self, frm, to, message):
    """Send email from frm to to with message."""
    mail.send_mail(frm, to, "You were mentioned in Nodify!", message)

  def post(self):
    user = users.get_current_user()  
    message = self.request.get('message')
    idea = model.Idea.read(self.request.get('idea_id', ''))
    if not user:
      self.error(401)
      return
    if not message or not idea:
      self.error(404)
      return

    # Handle mentions
    mentions = get_mentions(message)
    mention_emails = get_emails(mentions, idea.collabs)
    for email in idea.collabs:
      uc = UserConnection.get_or_create(email)
      if not uc.connected and email in mention_emails:
        self.send_email(user.email(), email, message)
      else:
        channel.send_message(email, json.dumps({
          'idea_id': idea.key.urlsafe(),
          'from': user.email().lower(),
          'message': message,
          'time': str(datetime.datetime.now()) }))

    # Handle collab actions:
    for mention, command in get_commands(message).iteritems():
      logging.info('MENTION %s %s' % (mention, command))
      email = gmail_from_mention([mention])[0]
      uc = UserConnection.get_or_create(email)

      if command == 'pitch':
        body = '%s wants to pitch an idea called "%s" to you!' % (user.email(), idea.name)
        self.send_email(user.email(), email, body)
        if uc.connected:
          channel.send_message(email, json.dumps({
            'idea_id': idea.key.urlsafe(),
            'from': user.email().lower(),
            'message': body,
            'time': str(datetime.datetime.now()) }))

      if command == 'collab':
        idea.collabs.append(email)
        idea.put()
        logging.info('EMAIL %s UC %s' % (email, uc))
        body = '%s added you as a collaborator on idea "%s".' % (user.email(), idea.name)
        if not uc.connected:
          logging.info('EMAIL %s %s %s' % (user.email(), email, body))
          self.send_email(user.email(), email, body)
        else: 
          logging.info('CHAT %s %s %s' % (user.email(), email, body))
          channel.send_message(email, json.dumps({
            'idea_id': idea.key.urlsafe(),
            'from': user.email().lower(),
            'message': body,
            'time': str(datetime.datetime.now()) }))

class ChatToken(webapp2.RequestHandler):
  """Handler for getting chat tokens."""
  
  def post(self):
    self.get()

  def get(self):      
    user = users.get_current_user()
    if not user:
      self.response.error(401)
      return
    token = channel.create_channel(user.email().lower())
    self.response.headers["Content-Type"] = "application/json"        
    self.response.out.write('{"token": "%s"}' % token)

handler = webapp2.WSGIApplication(
    [('/chat/token', ChatToken),
     ('/chat/message', ChatMessage),
     ('/_ah/channel/connected/', ClientConnect),
     ('/_ah/channel/disconnected/', ClientDisconnect)],
    debug=True)
         
def main():
    run_wsgi_app(handler)

if __name__ == "__main__":
    main()

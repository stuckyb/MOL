#!/usr/bin/python
#
# Copyright (C) 2010 Google Inc.

""" ClientLogin.
"""

__author__ = 'kbrisbin@google.com (Kathryn Brisbin)'

from google.appengine.api import urlfetch
import urllib

class ClientLogin():
  def authorize(self, username, password):
    auth_uri = 'https://www.google.com/accounts/ClientLogin'
    authreq_data = urllib.urlencode({
        'Email': username,
        'Passwd': password,
        'service': 'gestalt',#,fusiontables',
        'accountType': 'GOOGLE'})

    result = urlfetch.fetch(
      url=auth_uri,
      payload=authreq_data,
      method=urlfetch.POST)

    auth_resp_dict = dict(
      x.split('=') for x in result.content.split('\n') if x)
    
    return auth_resp_dict['Auth']


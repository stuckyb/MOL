import json
import logging
import urllib

from google.appengine.api import urlfetch

def markdown(text):
    data = json.dumps(dict(text=text,mode='markdown'))
    result = urlfetch.fetch(
            url='https://api.github.com/markdown',
            payload=data,
            method=urlfetch.POST)
    return result.content
    
def repos(action, user, access_token, params):
    if action == 'create':
        data = json.dumps(params)
        result = urlfetch.fetch(
            url='https://api.github.com/user/repos',
            payload=data,
            method=urlfetch.POST,
            headers={'Authorization': 'token %s' % access_token})
        if result.status_code == 201:
            logging.info('Repo created %s' % result.content)
            return result.content
        else:
            logging.info(result.status_code)
            logging.info(result.content)
            return None

    

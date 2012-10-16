"""This module contains support for services."""

from goog.ndb_json import encode as dumps

import datetime
import json
import htmlentitydefs
import random
import re
import string
import logging

_services = {}

def register(topic, service):
    """Register a service for the supplied topic."""
    _services[topic] = service

def execute(topic, data, user=None, request=None):
    """Execute a service for the supplied topic."""
    service = _services.get(topic)
    if service:
        service.execute(topic, data, user=user, request=request)

def init():
    """Initialize all services."""
    #from mol.service import foo as Foo

class Crud():

    @classmethod
    def id_name(cls, model):
        """Return model id name."""
        return '%s_id' % model._get_kind().lower()

    @classmethod
    def id_payload(cls, model, urlsafe):
        """Return model id payload."""
        return {cls.id_name(model): urlsafe}

    @classmethod
    def respond(cls, request, payload, status=200):
        """Respond to client with JSON payload."""
        request.response.status = status
        request.response.headers['Content-Type'] = 'application/json'        
        request.response.headers['charset'] = 'utf-8'        
        request.response.out.write(dumps(payload))
    
    @classmethod
    def create(cls, model, props, key_name=None, parent=None):
        """Create a Model and return the key."""
        return model.create(props, key_name=key_name, parent=parent)        

    @classmethod
    def read(cls, request, model, urlsafe):
        """Read a Model."""
        payload = dumps(model.read(urlsafe)._to_dict())
        payload[cls.id_name(model)] = urlsafe
        cls.respond(request, payload)
    
    @classmethod
    def update(cls, request, model, urlsafe, props):
        """Update a model."""
        model.update(urlsafe, props);
        cls.respond(request, cls.id_payload(model, urlsafe))
        
    @classmethod
    def delete(cls, request, model, urlsafe):
        """Delete a model."""
        model.delete(urlsafe)
        request.response.status = 204

def slugify(text, length=5, separator="-"):
    words = text.split()[:length]
    text = ' '.join(words)
    ret = ''
    for c in text.lower():
        try:
            ret += htmlentitydefs.codepoint2name[ord(c)]
        except:
            ret += c
    ret = re.sub('([a-zA-Z])(uml|acute|grave|circ|tilde|cedil)', r'\1', ret)
    ret = ret.strip()
    ret = re.sub(' ', '_', ret)
    ret = re.sub('\W', '', ret)
    ret = re.sub('[ _]+', separator, ret)

    return ret.strip()

def random_str(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for x in range(size))

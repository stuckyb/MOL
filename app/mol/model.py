"""This module contains the Hylo data model."""

# Hylo imports
from hylo import mps
from hylo import bus

# Standard Python imports
import json
import logging

# EngineAuth imports
import engineauth.models as engineauth

# Google App Engine imports
from google.appengine.ext import ndb
from google.appengine.ext.ndb import polymodel
from goog.ndb_json import encode as dumps

def key_id(name):
    """Return key id from supplied string s."""
    return '-'.join(name.split()).lower()

def urlsafe2key(urlsafe):
    """Return Idea Key from supplied urlsafe string."""
    return ndb.Key(urlsafe=urlsafe)

class HyloModel(ndb.Model):
    """Base model for Hylo."""

    @classmethod
    def create(cls, props, key_name=None, parent=None):
        """Create Model. """
        if key_name:
            key = ndb.Key(cls._get_kind(), key_id(key_name), parent=parent)
            return cls(key=key, **props).put()
        else:
            model = cls(parent=parent)
            model.populate(**props)
            return model.put()

    @classmethod
    def read(cls, urlsafe):
        """Read Model."""
        return urlsafe2key(urlsafe).get()
        
    @classmethod
    def update(cls, urlsafe, props):
        """Update Model."""
        model = cls.read(urlsafe)
        model.populate(**props)
        return model.put()

    @classmethod
    def delete(cls, urlsafe):
        """Delete Model."""
        urlsafe2key(urlsafe).delete()

def get_urlsafe_key(model):
    """Return urlsafe key for supplied model."""
    return model.key.urlsafe();

def get_username(model):
    """Return username for model."""
    return model.user_key.get().username

def get_user_image(model):
    """Return user image for model."""
    profile = ndb.Key('UserProfile', model.user_key.get().auth_ids[0]).get()
    return profile.user_info['info']['image']['url']

def get_model_parent_kind(model):
    """Return model's parent model's kind."""
    return model.key.parent().get()._get_kind().lower()

def get_model_parent_name(model):
    """Return model's parent model's name."""
    return model.key.parent().get().name

class Comment(HyloModel):
    """Comment model. Parent is an Idea key."""
    id = ndb.ComputedProperty(get_urlsafe_key)
    content = ndb.StringProperty('a', required=True, indexed=False)
    user_key = ndb.KeyProperty('u', required=True)
    username = ndb.ComputedProperty(get_username)
    user_image = ndb.ComputedProperty(get_user_image)
    created = ndb.DateTimeProperty('c', auto_now_add=True)
    updated = ndb.DateTimeProperty('e', auto_now=True)

    # @classmethod
    # def _post_put_hook(cls, future):
    #     key = future.get_result()
    #     idea_id = key.parent().urlsafe()
    #     comment = key.get().to_dict()
    #     comment['idea_id'] = idea_id
    #     event = '{"topic": "comment/put", "data": %s}' % dumps(comment)
    #     bus.fire(event)

    @classmethod
    def list(cls, parent):
        """List all comments for an ancestor key ordered by date created."""
        return Comment.query(ancestor=parent).order(Comment.created).fetch()

    @classmethod
    def countByParent(cls, parent):
        """Count all comments for an ancestor key."""
        return Comment.query(ancestor=parent).count()

    @classmethod
    def countByOwner(cls, user):
        """Count all comments for a user key.""" 
        return Comment.query(Comment.user_key==user).count()
        
class Idea(HyloModel):
    """The Idea model. Parent is a User key."""
    #id = ndb.ComputedProperty(get_urlsafe_key)
    name = ndb.StringProperty('n')
    description = ndb.StringProperty('d', indexed=False)
    status = ndb.StringProperty('s', default='new')
    public = ndb.BooleanProperty('p', default=True)
    tags = ndb.StringProperty('t', repeated=True)
    collabs = ndb.KeyProperty('b', repeated=True)
    created = ndb.DateTimeProperty('c', auto_now_add=True)
    updated = ndb.DateTimeProperty('e', auto_now=True)

    @classmethod
    def list(cls, parent):
        """List all ideas for an ancestor key ordered by date created."""
        return Idea.query(ancestor=parent).order(-Idea.created).fetch()

    @classmethod
    def raised_sum(cls, model):
        return Transaction.sumByParent(model.key)

    @classmethod
    def comment_count(cls, model):
        return Comment.countByParent(model.key)

class Campaign(HyloModel):
    """The Campaign model. Parent is an Idea key."""
    #id = ndb.ComputedProperty(get_urlsafe_key)
    slug = ndb.StringProperty('l')
    title = ndb.StringProperty('n', required=True)
    text = ndb.TextProperty('d', required=True)
    html = ndb.TextProperty('h')
    video_url = ndb.StringProperty('v', required=True)
    tags = ndb.StringProperty('t', repeated=True)
    public = ndb.BooleanProperty('p', default=True)
    status = ndb.StringProperty('s', default='draft')
    beneficiary_name = ndb.StringProperty('bn', required=True)
    beneficiary_email = ndb.StringProperty('be', required=True)
    beneficiary_address = ndb.StringProperty('ba', required=True)
    beneficiary_user_key = ndb.KeyProperty('bu')
    goal_dollars = ndb.IntegerProperty('gd', default=0, indexed=False)
    deadline = ndb.DateTimeProperty('dl', required=True)
    created = ndb.DateTimeProperty('c', auto_now_add=True)
    updated = ndb.DateTimeProperty('e', auto_now=True)

    @classmethod
    def total_dollars(cls, model):
        return Transaction.sumByParent(model.key)

    @classmethod
    def comment_count(cls, model):
        return Comment.countByParent(model.key)

class Opportunity(HyloModel):
    """The Opportunity model. Parent is a Campaign key."""
    id = ndb.ComputedProperty(get_urlsafe_key)
    slug = ndb.StringProperty('l')
    title = ndb.StringProperty('n')
    description = ndb.TextProperty('d', indexed=False, required=True)
    tags = ndb.StringProperty('t', repeated=True)
    public = ndb.BooleanProperty('p', default=True)
    cost_dollars = ndb.IntegerProperty('gd', default=0, indexed=False)
    created = ndb.DateTimeProperty('c', auto_now_add=True)
    updated = ndb.DateTimeProperty('e', auto_now=True)

    @classmethod
    def list(cls, parent):
        """List all opportunity for an ancestor key ordered by date created."""
        return Opportunity.query(ancestor=parent).order(-Opportunity.created).fetch()

    @classmethod
    def comment_count(cls, model):
        return Comment.countByParent(model.key)

    # TODO: make this work ... this should find all transactions that include this opportunity
    # @classmethod
    # def takers_count(cls, model):
    #     return Transactions.countByParent(model.key)

    # TODO: add a saves model for this.
    # @classmethod
    # def save_count(cls, model):
    #     return Save.countByParent(model.key)

class Transaction(HyloModel):
    """Transaction model. Parent is an Idea key."""
    id = ndb.ComputedProperty(get_urlsafe_key)
    amount_in_cents = ndb.IntegerProperty('a', required=True, indexed=False)
    user_key = ndb.KeyProperty('u', required=True)
    opportunity_key = ndb.KeyProperty('o')
    username = ndb.ComputedProperty(get_username)
    user_image = ndb.ComputedProperty(get_user_image)
    created = ndb.DateTimeProperty('c', auto_now_add=True)
    updated = ndb.DateTimeProperty('e', auto_now=True)

    # @classmethod
    # def _post_put_hook(cls, future):
    #     key = future.get_result()
    #     idea_id = key.parent().urlsafe()
    #     transaction = key.get().to_dict()
    #     transaction['idea_id'] = idea_id
    #     event = '{"topic": "transaction/put", "data": %s}' % dumps(transaction)
    #     bus.fire(event)

    @classmethod
    def list(cls, parent):
        """List all transactions for an ancestor key ordered by date created."""
        return Transaction.query(ancestor=parent).order(Transaction.created).fetch()

    @classmethod
    def sumByParent(cls, parent):
        """Sum all transactions for an ancestor key.""" 
        sum_in_cents = 0
        for t in Transaction.query(ancestor=parent).fetch():
            sum_in_cents = sum_in_cents + t.amount_in_cents
        return sum_in_cents

    @classmethod
    def sumByOwner(cls, user):
        """Sum all transactions for a user key.""" 
        sum_in_cents = 0
        for t in Transaction.query(Transaction.user_key==user).fetch():
            sum_in_cents = sum_in_cents + t.amount_in_cents
        return sum_in_cents

    @classmethod
    def sumByParentOwner(cls, user):
        """Sum all transactions for a user's ancestors (ideas at this point)."""
        sum_in_cents = 0
        for i in Idea.query(ancestor=user).fetch():
            for t in Transaction.query(ancestor=i.key).fetch():
                sum_in_cents = sum_in_cents + t.amount_in_cents
        return sum_in_cents

class Pitch(HyloModel):
    """Pitch model. Parent is an Idea key."""
    id = ndb.ComputedProperty(get_urlsafe_key)
    pitchees = ndb.KeyProperty('t', repeated=True)
    public = ndb.BooleanProperty('p', default=True)
    parent_name = ndb.ComputedProperty(get_model_parent_name)
    user_key = ndb.KeyProperty('u', required=True)
    username = ndb.ComputedProperty(get_username)
    user_image = ndb.ComputedProperty(get_user_image)
    created = ndb.DateTimeProperty('c', auto_now_add=True)
    updated = ndb.DateTimeProperty('e', auto_now=True)

    # @classmethod
    # def _post_put_hook(cls, future):
    #     key = future.get_result()
    #     idea_id = key.parent().urlsafe()
    #     pitch = key.get().to_dict()
    #     pitch['idea_id'] = idea_id
    #     event = '{"topic": "pitch/put", "data": %s}' % dumps(pitch)
    #     bus.fire(event)

    @classmethod
    def list(cls, parent):
        """List all pitchs for an ancestor key ordered by date created."""
        return Pitch.query(ancestor=parent).order(Pitch.created).fetch()

class History(HyloModel):
    """History model. Parent is an Idea or User key."""
    id = ndb.ComputedProperty(get_urlsafe_key)
    kind = ndb.ComputedProperty(get_model_parent_kind)
    parent_name = ndb.ComputedProperty(get_model_parent_name)
    verb = ndb.StringProperty('v')
    status = ndb.StringProperty('s')
    user_key = ndb.KeyProperty('u', required=True)
    username = ndb.ComputedProperty(get_username)
    user_image = ndb.ComputedProperty(get_user_image)
    created = ndb.DateTimeProperty('c', auto_now_add=True)
    updated = ndb.DateTimeProperty('e', auto_now=True)

    # @classmethod
    # def _post_put_hook(cls, future):
    #     key = future.get_result()
    #     idea_id = key.parent().urlsafe()
    #     history = key.get().to_dict()
    #     history['idea_id'] = idea_id
    #     event = '{"topic": "history/put", "data": %s}' % dumps(history)
    #     bus.fire(event)

    @classmethod
    def list(cls, parent):
        """List all history for an ancestor key ordered by date created."""
        return History.query(ancestor=parent).order(History.created).fetch()

"""This module contains the Hylo page router."""

# Hylo imports
import model #from model import Idea, Comment, Transaction

# EngineAuth imports
from engineauth.models import User

# Standard Python imports
import json
import logging
import webapp2
from webapp2_extras import jinja2

# Google App Engine imports
from google.appengine.ext import ndb

# Google imports
from goog import ndb_json

class Jinja2Handler(webapp2.RequestHandler):
    
    @webapp2.cached_property
    def jinja2(self):
        return jinja2.get_jinja2(app=self.app)

    def get_messages(self, key='_messages'):
        try:
            return self.request.session.data.pop(key)
        except KeyError:
            return None

    def render_template(self, template_name, template_values={}):
        messages = self.get_messages()
        if messages:
            template_values.update({'messages': messages})
        self.response.write(self.jinja2.render_template(
            template_name, **template_values))

    def render_string(self, template_string, template_values={}):
        self.response.write(self.jinja2.environment.from_string(
            template_string).render(**template_values))

    def json_response(self, json):
        self.response.headers.add_header('content-type', 'application/json',
                                        charset='utf-8')
        self.response.out.write(json)

class PageHandler(Jinja2Handler):

    def getSession(self):
        return self.request.session if self.request.session else None

    def getUser(self):
        return self.request.user if self.request.user else None

    def getUserProfiles(self, user):
        profile_keys = [ndb.Key('UserProfile', p) for p in user.auth_ids]
        return ndb.get_multi(profile_keys)

    def root(self):
        session = self.getSession()
        user = self.getUser()
        if not user:
            return self.render_template('splash.html', {
                'title': 'Hylo - Social Building',
                'session': session,
                'header': 'default'
            })
        profiles = self.getUserProfiles(user);
        self.render_template('home.html', {
            'title': 'Hylo',
            'user': user,
            'session': session,
            'profiles': profiles,
            'header': 'default'
        })

    def signup(self):
        session = self.getSession()
        user = self.getUser()
        if user:
            return self.redirect('/')
        self.render_template('signup.html', { 
            'title': 'Sign up',
            'header': 'default'
        })

    def login(self):
        session = self.getSession()
        user = self.getUser()
        if user:
            return self.redirect('/')
        self.render_template('login.html', {
            'title': 'Log in',
            'header': 'default'
        })

    def logout(self):
        self.response.delete_cookie('_eauth')
        self.redirect('/login')

    def settings(self):
        session = self.getSession()
        user = self.getUser() 
        if not user:
            return self.redirect('/login')
        profiles = self.getUserProfiles(user);
        self.render_template('settings.html', {
            'title': 'Your Profile',
            'user': user,
            'session': session,
            'profiles': profiles,
            'model': ndb_json.encode(user), # slop!
            'header': 'default'
        })

    def profile(self, username):
        session = self.getSession()
        user = self.getUser()
        if not user:
            return self.redirect('/login')
        profiles = self.getUserProfiles(user);
        owner = User.query(User.username==username).order(User.created).fetch()
        if not owner:
            return self.render_template('404.html', {
                'title': 'Hylo - Not Found',
                'user': user,
                'session': session,
                'profiles': profiles,
                'header': 'default'
            })
        owner = owner[0]
        owner_profiles = self.getUserProfiles(owner);
        self.render_template('profile.html', {
            'title': owner.username + ' (' + owner_profiles[0].user_info['info']['displayName'] + ')',
            'user': user,
            'session': session,
            'profiles': profiles,
            'owner': owner,
            'owner_profiles': owner_profiles,
            'gave': model.Transaction.sumByOwner(owner.key),
            'received': model.Transaction.sumByParentOwner(owner.key),
            'model': ndb_json.encode(owner), # slop!
            'header': 'default'
        })

    def idea(self, username, name):
        session = self.getSession()
        user = self.getUser()
        if not user:
            return self.redirect('/login')
        profiles = self.getUserProfiles(user);
        owner = User.query(User.username==username).order(User.created).fetch()
        if not owner:
            return self.render_template('404.html', {
                'title': 'Hylo - Not Found',
                'user': user,
                'session': session,
                'profiles': profiles
            })
        owner = owner[0]
        owner_profiles = self.getUserProfiles(owner);
        idea = model.Idea.query(model.Idea.name==name, ancestor=owner.key).fetch()
        if not idea:
            return self.render_template('404.html', {
                'title': 'Hylo - Not Found',
                'user': user,
                'session': session,
                'profiles': profiles,
                'header': 'default'
            })
        idea = idea[0]
        self.render_template('idea.html', {
            'title': owner.username + '/' + idea.name,
            'user': user,
            'session': session,
            'profiles': profiles,
            'owner': owner,
            'owner_profiles': owner_profiles,
            'idea': idea,
            'raised': model.Transaction.sumByParent(idea.key),
            'model': ndb_json.encode(idea), # slop!
            'header': 'default'
        })

    def campaign(self, slug):
        logging.info('CAMPAIGN')
        session = self.getSession()
        user = self.getUser()
        profiles = []
        if user:
            profiles = self.getUserProfiles(user);
        campaign = model.Campaign.query(model.Campaign.slug==slug).fetch()
        if not campaign:
            return self.render_template('404.html', {
                'title': 'Hylo - Not Found',
                'user': user,
                'session': session,
                'profiles': profiles,
                'header': 'default'
            })
        campaign = campaign[0]
        self.render_template('campaign.html', {
            'title': campaign.title,
            'user': user,
            'session': session,
            'profiles': profiles,
            'campaign': campaign,
            'model': ndb_json.encode(campaign), # slop!
            'header': 'campaign'
        })

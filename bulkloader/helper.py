#!/usr/bin/env python

# Copyright 2011 The Regents of the University of California
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

__author__ = "Aaron Steele (eightysteele@gmail.com)"

"""This module contains transformation functions for the bulkloader."""

# Setup sys.path for bulkloading
import os, sys

import csv_unicode

# Standard Python modules
import csv
csv.field_size_limit(1000000000)

import collections
import json
import logging
import re

# App Engine modules
from google.appengine.ext import db
from google.appengine.api import datastore
from google.appengine.ext.bulkload import transform

# NDB modules
from google.appengine.ext.ndb import model
from google.appengine.ext import db

def load_names():
    """Loads names.csv into a defaultdict with scientificname keys mapped to
    a list of common names."""
    global names_map
    names_map = collections.defaultdict(list)
    for row in csv_unicode.UnicodeDictReader(open('english_names.csv', 'r')):
        names_map[row['scientific'].strip()].append(row)

#load_names()

def name_keys(name):
    """Generates name keys that are at least 3 characters long.

    Example usage:
        > name_keys('concolor')
        > ['con', 'conc', 'conco', 'concol', 'concolo', 'concolor']
    """
    yield name.strip()
    for n in name.split():
        name_len = len(n)
        yield n
        if name_len > 3:
            indexes = range(3, name_len)
            indexes.reverse()
            for i in indexes:
                yield n[:i]

def create_text():
    def wrapper(value, bulkload_state):
        """Returns current_dictionary (a row in the CSV file) as JSON text."""
        return db.Text(value)
    return wrapper

def create_key():
    def wrapper(value, bulkload_state):
        d = bulkload_state.current_dictionary
        return transform.create_foreign_key('CacheItem')(value)
    return wrapper

def build_index(input_dict, instance, bulkload_state_copy):
    """Adds dynamic properties from the CSV input_dict to the entity instance."""

    entities = [instance]
    names = names_map[input_dict['scientificname']]
    logging.info('Names %s' % names)
    logging.info('input_dict %s' % input_dict)
    logging.info('state %s' % bulkload_state_copy)
    logging.info('Entities %s' % entities)
    return entities

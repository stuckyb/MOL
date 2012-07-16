#!/usr/bin/env python
# vim: set fileencoding=utf-8 :
#
# Copyright 2011, 2012 Aaron Steele, John Wieczorek, Gaurav Vaidya
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
"""
    Script to manage MOL metadata updates. Sets feature_count and extent fields in layer_metadata to speed up search results listings.
"""

import logging
import psycopg2
import os
import pprint
import subprocess
import sys
import json
import codecs
import time
import random
import urllib2
import urllib

from cartodb import CartoDBOAuth as CartoDB, CartoDBException
from optparse import OptionParser
# The CartoDB object we use to communicate with the server.
cartodb = None
# The CartoDB setting used to login to the server.
cartodb_settings = None

def update_layers():
    "Download all layers from CartoDB and store in CSV file"
    print 'Getting layer definitions...'
    url = "http://mol.cartodb.com/api/v2/sql?q=select%20scientificname,%20type,%20provider%20from%20layer_metadata%20order%20by%20scientificname"
    response = urllib2.urlopen(url)
    rows = json.loads(response.read())['rows']

    try:
        sql_statements = set()
        for row in rows:
            scientificname = row['scientificname'].strip()
            row['scientificname'] = scientificname
            type = row['type'].strip()
            row['type'] = type
            provider = row['provider'].strip()
            row['provider'] = provider
            if(provider != 'gbif'):
                sql = "UPDATE layer_metadata l set feature_count = p.feature_count, extent = p.extent FROM (SELECT ST_Extent(the_geom) as extent, count(*) as feature_count, scientificname, type, provider from polygons group by scientificname, type, provider having scientificname = '%s' and type = '%s' and provider = '%s') p WHERE l.scientificname = p.scientificname and l.provider = p.provider and l.type = p.type" % (scientificname, type, provider)
            else:
                sql = "UPDATE layer_metadata l set feature_count = p.feature_count, extent = p.extent FROM (SELECT ST_Extent(the_geom) as extent, count(*) as feature_count, lower(scientificname) as scientificname, TEXT('points') as type, TEXT('gbif') as provider from gbif_import group by lower(scientificname) having lower(scientificname) = lower('%s')) p WHERE lower(l.scientificname) = lower(p.scientificname) and l.provider = p.provider and l.type = p.type" % (scientificname)

            logging.info("Updating %s, type:%s, provider:%s" % (scientificname, type, provider))
            sendSQLStatementToCartoDB(sql)

    finally:
        logging.info("Yoink")


    print 'Done updating layer metadata'


def sendSQLStatementToCartoDB(sql):
    """ A helper method for sending an SQL statement (or multiple SQL statements in a
    single string) to CartoDB. Note that cartodb is only initialized once; it is stored
    as a global, and reused on subsequent calls.
    """

    global cartodb
    global cartodb_settings

    if cartodb is None:
        cartodb = CartoDB(
            cartodb_settings['CONSUMER_KEY'],
            cartodb_settings['CONSUMER_SECRET'],
            cartodb_settings['user'],
            cartodb_settings['password'],
            cartodb_settings['domain'],

        )

    tries = 3

    while (tries > 0):
        try:
            result = cartodb.sql(sql)
            tries = 0
        except CartoDBException as e:
            #if str(e) == 'internal server error' or str(e) == 'current transaction is aborted, commands ignored until end of transaction block':
            logging.info("\t  CartoDB exception caught ('%s'), retrying ...", e)
            time.sleep(random.randint(3,9))
            result = None
            tries = tries - 1

    if result is None:
        logging.error("\t  ERROR! Unable to execute SQL statement <<%s>>; continuing.", sql)
        return

        logging.info("\t  Result: %s" % result)

cmdline_options = None
def _getoptions():
    ''' Returns the parsed command line options.'''

    global cmdline_options
    while cmdline_options is None:
        cmdline_options = parse_cmdline()

    return cmdline_options

def parse_cmdline():
    ''' Parses command line options and returns them.'''
    parser = OptionParser()
    return parser.parse_args()[0]


def main():
    """ The main() method; code execution begins here unless this
    file has been imported as a library. This method determines which
    directories the user has decided should be uploaded, and then calls
    uploadToCartoDB() on those directories."""

    options = _getoptions()
    logging.basicConfig(level=logging.DEBUG, format="%(levelname)s:%(module)s:%(relativeCreated)d:%(message)s")

    # Load up the cartodb settings: we'll need them later.
    global cartodb_settings
    try:
        cartodb_settings = json.loads(
            codecs.open('cartodb.json', encoding='utf-8').read(),
            encoding='utf-8')
    except Exception as ex:
        logging.error("Could not load CartoDB setting file 'cartodb.json': %s" % ex)
        exit(1)

    update_layers()



if __name__ == '__main__':
    main()

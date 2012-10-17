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
    Really dump script to execute a single text 
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
import urllib

from cartodb import CartoDBOAuth as CartoDB, CartoDBException
from optparse import OptionParser
# The CartoDB object we use to communicate with the server.
cartodb = None
# The CartoDB setting used to login to the server.
cartodb_settings = None

def uploadToCartoDB():
    table_definition = ''
    set_table_definition = False
    dumpfile = _getoptions().dumpfile

    logging.info("Sending '%s' as to CartoDB SQL API." % dumpfile)
    try:
        f = open( dumpfile , 'r')
        sendSQLStatementToCartoDB(f.read())
            
    finally:
        logging.info("Processing of file '%s' completed." % dumpfile)

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

    # Do these changes as a single transaction:
    #sql = "BEGIN TRANSACTION; " + sql + "; COMMIT TRANSACTION;"

    print "Executing SQL: «%s»" % sql

    tries = 10

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
    parser.add_option('-s', '--source_file',
                      type='string',
                      dest='dumpfile',
                      help='Path to the SQL file to load.')
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

    uploadToCartoDB()



if __name__ == '__main__':
    main()

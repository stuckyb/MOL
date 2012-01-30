#!/usr/bin/env python
#
# Copyright 2011 Aaron Steele
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

"""This module bulkloads multiple Shapefiles to a Google Fusion Table.

If the Google Fusion Table doesn't exist, it will be created. Each polygon in 
the shapefile will be appended to the table, 1 row per polygon.

This code depends on GDAL 1.9dev in order to leverage the Google Fusion Tables
(GFT) driver.

  http://www.gdal.org/ogr/drv_gft.html

Note: If you're using Google's 2-step verification, at the password prompt you'll 
need to use an application specific password that can be generated here:

  https://www.google.com/accounts/IssuedAuthSubTokens

Usage example:

  ./shp2gft.py -d /home/aaron/shapefiles -t mol_layers

The above command bulkloads all Shapefiles in /home/aaron/shapefiles to the 
existing mol_layers Google Fusion Table. 

For full usage information:

  ./shp2gft.py --help
"""

# Put FT library on path.
import sys
sys.path.append('gft/src')
from authorization.oauth import OAuth
from sql.sqlbuilder import SQL
import ftclient

from authorization.oauth import OAuth
from sql.sqlbuilder import SQL
import ftclient

import getpass
import glob
import logging
import optparse
import os
import re
import shlex
import shutil
import simplejson
import subprocess
import tempfile
import yaml

CACHE_FILE = os.path.expanduser("~/shp2gft_cache.json")
cache = None

def _load_cache():
    global CACHE_FILE, cache

    # Nothing to load? That's fine.
    if not os.path.exists(CACHE_FILE):
        cache = {}
        return

    logging.info("Loading cache from '%s'.", CACHE_FILE)

    f = open(CACHE_FILE, "r")
    cache = simplejson.load(f)
    f.close()

def _save_cache():
    global CACHE_FILE, cache

    f = open(CACHE_FILE, "w")
    simplejson.dump(cache, f, indent="    ")
    f.close()

    logging.info("Saving cache to '%s'.", CACHE_FILE)

def get_cache():
    global cache

    while cache is None:
        _load_cache()

    return cache

def _get_creds(email=None):
    """Prompts the user and returns a username and password."""
    if not email:
        print 'Please enter login credentials for Fusion Tables'
        email = raw_input('Email: ')

    if email:
        password_prompt = 'Password for %s: ' % email
        password = getpass.getpass(password_prompt)
    else:
        password = None

    return email, password

def _get_auth_token(email, passwd):
    """Gets the Google Fusion Table authentication token."""
    cmd = 'ogrinfo --config CPL_DEBUG ON "GFT:email=%s password=%s"' \
        % (email, passwd)
    p = subprocess.Popen(
        shlex.split(cmd), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    error, output = p.communicate()

    try:
        m = re.search("^GFT: Auth key : (.*)\s*$", output, flags=re.MULTILINE);
        if m is None:
            raise Exception('Invalid credentials. Hint: are you using Google 2-step authentication?')
        return m.group(1);
    except Exception as e:
        logging.error(e)
        sys.exit(0)
    
def _get_feature_count(pathname):
    """ Returns the number of features in the shapefile at pathname. """

    command = 'ogrinfo -al -so %s' % pathname
    p = subprocess.Popen(
        shlex.split(command), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()

    m = re.search("^Feature Count: (\d+)\s*$", output, flags=re.MULTILINE)
    if m is None:
        raise Exception("Could not get feature count: ogr2ogr produced the following output - <<%s>>" % output);
    count = int(m.group(1))

    logging.info('shapefile: %s, polygon count: %s' % (pathname, count))
    return count

def _create_fusion_table(name, oauth_client):
    """Creates a new FT by name."""
    table = {
        name: {
            'SpecID':'NUMBER', 
            'Latin':'STRING', 
            'OccCode':'NUMBER',
            'Date':'STRING',
            'EditsInfo':'STRING',
            'Citation':'STRING',
            'Notes':'STRING',
            'Origin':'NUMBER',
            'geometry': 'LOCATION'
            }
        }
    tableid = int(oauth_client.query(SQL().createTable(table)).split("\n")[1])
    logging.info('Created new Fusion Table: http://www.google.com/fusiontables/DataSource?dsrcid=%s' % tableid)

def upload(name, table, sfd):
    """Uploads a shapefile to Google Fusion Tables.

    Args:
        name - The shapefile name.
        table - The table name.
        sfd - The directory of shapefiles.
    """
    os.chdir(sfd)

    workspace = tempfile.mkdtemp()

    # Copy and rename the shapefile into the workspace.
    for x in glob.glob('%s.*' % name):
        dst = os.path.join(workspace, table)
        shutil.copy(x, x.replace(name, dst))

    # Upload shapefile to the Google Fusion table.
    os.chdir(workspace)
    command = 'ogr2ogr -append -f GFT "GFT:" %s.shp' % table
    p = subprocess.Popen(
        shlex.split(command), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    p.wait()
    output, error = p.communicate()
    
    if output:
	logging.info("ogr2ogr on stdout: %s" % output)

    if error:
        logging.error("ogr2ogr on stderr: %s" % error)

    logging.info('Appended %s polygons to the %s Fusion Table' \
                     % (name, table))

    shutil.rmtree(workspace)

def _upload(args):
    """Helper function that unpacks args for upload()."""
    upload(*args)

def main():
    """Bulkloads shapefiles to an existing Google Fusion Table.

    The basic algorithm is to copy each Shapefile into the workspace directory,
    rename it so that it's the same name as the Google Fusion Table, bulkload
    it using the ogr2ogr command, delete the Shapefile from the workspace
    directory, and repeat.

    Renaming the Shapefile is a hack that tricks ogr2ogr into appending different
    Shapefiles to the same table. There might be a better way of course. :)
    """
    logging.basicConfig(level=logging.DEBUG)
    options = _get_options()

    # Get Fusion Tables client.
    if not os.path.exists(options.config):
        logging.error("Could not find '%s'. Please create a client application at https://code.google.com/apis/console/, then enter your client id and secret into creds.yaml.", options.config)
        exit()
	
    config = yaml.load(open(options.config, 'r'))        
    consumer_key = config['client_id']
    consumer_secret = config['client_secret'] 

    cache = get_cache()

    # Get the GFT_TOKEN and GFT_SECRET from a config file.
    token = None
    if 'GFT_TOKEN' in cache:
        token = cache['GFT_TOKEN']
        secret = cache['GFT_SECRET']
        
    if token is None:
        url, token, secret = OAuth().generateAuthorizationURL(consumer_key, consumer_secret, consumer_key)
        print "Visit this URL in a browser: %s" % url
        raw_input("Hit enter after authorization")
        token, secret = OAuth().authorize(consumer_key, consumer_secret, token, secret)

    oauth_client = ftclient.OAuthFTClient(consumer_key, consumer_secret, token, secret)
    #oauth_client = ftclient.OAuthFTClient(consumer_key, consumer_secret)   

    # TODO Should run an SQL query through oauth_client just to make sure that
    # this is authorized correctly.

    # Save the SQL query.
    cache['GFT_TOKEN'] = token
    cache['GFT_SECRET'] = secret
    _save_cache()

    # Get authentication token.
    auth_token = os.getenv('GFT_AUTH')
    if not auth_token:
        email, passwd = _get_creds(options.email)
        auth_token = _get_auth_token(email, passwd)
        os.putenv('GFT_AUTH', auth_token)

    # The Shapefile directory.
    sfd = os.path.abspath(options.dir)
    os.chdir(sfd)

    # Setup the multiprocessing pool.
    table_count = 0
    feature_count = 0
    tasks = []

    # Upload shapefiles to FT.
    table_name = '%s-%s' % (options.table, table_count)
    _create_fusion_table(table_name, oauth_client)
    filenames = glob.glob('*.shp')
    filenames.sort()
    for f in filenames:
        count = _get_feature_count(os.path.join(sfd, f))
        upload(os.path.splitext(f)[0], table_name, sfd)
        feature_count += count
	logging.info("%d features uploaded so far.", feature_count)
            
    #global polygon_count
    # logging.info("%d polygons uploaded to %s.", polygon_count, table_name)
    logging.info("Finished, %d features from %d files uploaded.", feature_count, len(filenames))

def _get_options():
    """Creates and returns an new OptionParser with options."""
    parser = optparse.OptionParser()

    # Option specifying the directory containing the Shapefiles.
    parser.add_option(
        '-d', 
        type='string',
        dest='dir',
        help='Directory containing the Shapefiles.')

    # Option specifying the base table name for the Google Fusion Table.
    parser.add_option(
        '-t', 
        type='string',
        dest='table',
        help='Base table name.')

    # Option specifying a GMail address.
    parser.add_option(
        '-e', 
        type='string',
        dest='email',
        help='The GMail address used for authentication.')

    # Option specifying a config file.
    parser.add_option(
        '-f', 
        type='string',
        dest='config',
        default='creds.yaml',
        help='The config YAML file.')

    # Option specifying number of polygons per table.
    parser.add_option(
        '-n', 
        type='int',
        dest='max_rows',
        default=90000,
        help='Maximum polygons per table.')

    return parser.parse_args()[0]

if __name__ == '__main__':
    _load_cache()
    main()
    _save_cache()

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

import getpass
import glob
import logging
import multiprocessing
import optparse
import os
import shlex
import shutil
import subprocess
import sys
import tempfile

WORKSPACE_DIR_NAME = 'workspace'

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
        return output.split('\n')[2].split('GFT: Auth key : ')[1]
    except:
        logging.error('Invalid credentials. Hint: Are you using Google 2-step authentication?')
        sys.exit(0)
    
def _get_options():
    """Creates and returns an new OptionParser with options."""
    parser = optparse.OptionParser()

    # Option specifying the directory containing the Shapefiles.
    parser.add_option(
        '-d', 
        type='string',
        dest='dir',
        help='Directory containing the Shapefiles.')

    # Option specifying the name of the Google Fusion Table.
    parser.add_option(
        '-t', 
        type='string',
        dest='table',
        help='An existing Google Fusion Table name to append to.')

    # Option specifying a GMail address.
    parser.add_option(
        '-e', 
        type='string',
        dest='email',
        help='The GMail address used for authentication.')

    return parser.parse_args()[0]

def upload(name, table, sfd):
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
    error, output = p.communicate()
    
    if error:
        logging.info("ERROR: %s" % error)

    #subprocess.call(shlex.split(command))

    logging.info('Appended %s polygons to the %s Fusion Table' \
                     % (name, table))

    shutil.rmtree(workspace)

def _upload(args):
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
    
    # Get authentication token.
    auth_token = os.getenv('GFT_AUTH')
    if not auth_token:
        email, passwd = _get_creds(options.email)
        auth_token = _get_auth_token(email, passwd)
        os.putenv('GFT_AUTH', auth_token)

    # The Shapefile directory.
    sfd = os.path.abspath(options.dir)
    os.chdir(sfd)

    # Create workspace directory.
    if not os.path.exists(WORKSPACE_DIR_NAME): 
       os.mkdir(WORKSPACE_DIR_NAME)

    pool = multiprocessing.Pool(processes=200)
    tasks = [(os.path.splitext(f)[0], options.table, sfd) \
                 for f in glob.glob('*.shp')]
    logging.info('Preparing %s tasks' % len(tasks))
    result = pool.map_async(_upload, tasks, chunksize=200)
    result.wait()

    # for f in glob.glob('*.shp'):
    #     # Shapefile name without the .shp extension.
    #     name = os.path.splitext(f)[0]
        
        # # Copy and rename the shapefile into the workspace.
        # for x in glob.glob('%s.*' % name):
        #     dst = os.path.join(WORKSPACE_DIR_NAME, options.table)
        #     shutil.copy(x, x.replace(name, dst))

        # # Upload shapefile to the Google Fusion table.
        # os.chdir(WORKSPACE_DIR_NAME)
        # command = 'ogr2ogr -append -f GFT "GFT:" %s.shp' % options.table
        # subprocess.call(shlex.split(command))
        
        # logging.info('Appended %s polygons to the %s Fusion Table' \
        #                  % (name, options.table))
        
        # # Cleanup the workspace by deleting all files in it.
        # for item in os.listdir(os.curdir):
        #     os.remove(item)

        # # Change back into the Shapefiles directory.
        # os.chdir(sfd)
    
    # Remove workspace directory.
#    shutil.rmtree(WORKSPACE_DIR_NAME)

if __name__ == '__main__':
    main()

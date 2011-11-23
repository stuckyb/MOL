#!/usr/bin/env python
#
# Copyright 2011 Aaron Steele, John Wieczorek, Gaurav Vaidya
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

"""This script compresses a provider directory into a single all.json file for upload.

"""

import codecs
import glob
import logging
from optparse import OptionParser
import os
import simplejson
import subprocess
import time
from cartodb import CartoDB
from zipfile import ZipFile

from providerconfig import ProviderConfig

def ogr2ogr_path():
    """ Determines and returns the path to ogr2ogr. """

    # For Macs which have GDAL.framework, we can autodetect it
    # and use it automatically.

    ogr2ogr_path = '/Library/Frameworks/GDAL.framework/Programs/ogr2ogr'
    if not os.path.exists(ogr2ogr_path):
        # We don't have a path to use; let subprocess.call
        # find it.
        ogr2ogr_path = 'ogr2ogr'

    return ogr2ogr_path

def convertToJSON(provider_dir):
    """Converts the given directory into a JSON file (stored in the directory itself as 'all.json').

    If '$dir/all.json' already exists, it will be overwritten.
    """
    
    original_dir = os.path.abspath(os.path.curdir)
    os.chdir(provider_dir)
    logging.info("Now in directory '%s'." % provider_dir)

    filename = "mol_source_%s.json" % provider_dir
    if os.path.exists(filename):
        os.remove(filename)
    # all_json = open(filename, "a")
    all_json = codecs.open(filename, encoding='utf-8', mode="w")
    all_json.write("""{
  "type": "FeatureCollection",
  "features": [""")

    # We wrap this processing in a try-finally so that, no matter what happens,
    # we change back to the original directory before we leave this subroutine.
    try:
        # Step 1. Load and validate the config.yaml file.
        config = ProviderConfig("config.yaml", os.path.basename(provider_dir))
        config.validate()

        all_features = []

        # Step 2. For each collection, and then each shapefile in that collection:
        for collection in config.collections():
            os.chdir(collection.getdir())

            logging.info("Switching to collection '%s'." % collection.getdir())

            shapefiles = glob.glob('*.shp')
            for shapefile in shapefiles:

                # Determine the "name" (filename without extension) of this file.
                name = shapefile[0:shapefile.index('.shp')]

                # Step 2.1. Convert this shapefile into a GeoJSON file, projected to
                # EPSG 4326 (WGS 84).
                json_filename = '%s.json' % name
                
                # Delete existing geojson file since we're appending.
                if os.path.exists(json_filename):
                    os.remove(json_filename)

                command = [ogr2ogr_path(), 
                    '-f', 'GeoJSON', 
                    '-t_srs', 'EPSG:4326',
                    json_filename,
                    '%s.shp' % name
                ]
                                
                try:
                    subprocess.call(command)
                except:
                    logging.warn('Unable to convert %s to GeoJSON - %s' % (name, command))
                    if os.path.exists(json_filename):
                        os.remove(json_filename)
                    continue

                # Step 2.2. Load that GeoJSON file and do the mapping.
                #logging.info('Mapping fields from DBF to specification: %s' % json_filename)
                geojson = None
                try:
                    geojson = simplejson.loads(
                        codecs.open(json_filename, encoding='utf-8').read(), 
                        encoding='utf-8')

                except:
                    logging.error('Unable to open or process %s' % json_filename)
                    continue

                # Step 2.3. For every feature:
                row_count = 0
                for feature in geojson['features']:
                    row_count = row_count + 1

                    properties = feature['properties']
                    new_properties = collection.default_fields()

                    # Map the properties over.
                    for key in properties.keys():
                        (new_key, new_value) = collection.map_field(row_count, key, properties[key])
                        if new_value is not None:
                            new_properties[new_key] = unicode(new_value)

                    # Convert field names to dbfnames.
                    dbf_properties = {}
                    for fieldname in new_properties.keys():
                        dbf_properties[ProviderConfig.fieldname_to_dbfname(fieldname)] = new_properties[fieldname]
               
                    # Replace the existing properties with the new one.
                    feature['properties'] = dbf_properties

                    # Upload to CartoDB.
                    uploadGeoJSONEntry(feature, 'temp_geodb')
    
                    # Save into all_features.
                    all_features.append(feature)
                
                features_json = []
                for feature in all_features:
                    try:
                        features_json.append(simplejson.dumps(feature, ensure_ascii=False))
                    except:
                        logging.info('Unable to convert feature to JSON: %s' % feature)

                all_json.write(','.join(features_json))
                all_json.write(',')
                all_json.flush()
                all_features = []                
                    
                logging.info('%s converted to GeoJSON' % name)

            os.chdir('..')

        # Zip up the GeoJSON document
        all_json.write("""]}""")
        all_json.close()

        myzip = ZipFile('%s.zip' % filename, 'w')
        myzip.write(filename) # TODO: Fails for big files (4GB)
        myzip.close()

        logging.info("%s written successfully." % filename)

    finally:
        os.chdir(original_dir)

    logging.info("Processing of directory '%s' completed." % provider_dir)

def uploadGeoJSONEntry(entry, table_name):
    """Uploads a single GeoJSON entry to any URL capable of accepting SQL statements. We 
    convert the GeoJSON into a single INSERT SQL statement and send it.

    Arguments:
        entry: A GeoJSON row entry containing geometry and field information for upload.
        table_name: The name of the table to add this GeoJSON entry to.
        query_string: A URL format string containing a '%s', which will be replaced with
            a uri-encoded SQL string.

    Returns: none.
    """
    global cartodb_settings

    cdb = CartoDB(
        cartodb_settings['CONSUMER_KEY'],
        cartodb_settings['CONSUMER_SECRET'],
        cartodb_settings['user'],
        cartodb_settings['password'],
        cartodb_settings['cartodb_domain'],
        'http://layers.moldb.io:3000'
    )

    # Ugh. Sterilize SQL by eliminating "'"s.
    str_geom = simplejson.dumps(entry['geometry']).encode('utf-8')
    str_properties = entry['properties'].__str__().replace("\"", "\\\"").encode('utf-8')

    # print cdb.sql("INSERT INTO %s (original_geom, properties) VALUES ('%s', '%s')" % (table_name, str_geom.encode('ascii'), str_properties.encode('ascii')))
    # print cdb.sql("INSERT INTO %s (the_geom, properties) VALUES ('%s', '%s')" % (table_name, str_geom, "{\"blech\": \"eek\"}"))
    sql = "INSERT INTO %s (the_geom, properties) VALUES (ST_GeomFromGeoJSON('%s'::TEXT), '%s')" % (table_name, str_geom, "{\"blech\": \"eek\"}")
    print "SQL: [%s]" % sql
    print cdb.sql(sql)

    time.sleep(10)

def _getoptions():
    ''' Parses command line options and returns them.'''
    parser = OptionParser()
    parser.add_option('-s', '--source_dir',
                      type='string',
                      dest='source_dir',
                      help='Directory containing source to load.')
    parser.add_option('--no-validate', '-V',
                      action="store_true",
                      dest="no_validate",
                      help="Turns off validation of the config.yaml files being processed."
    )

    return parser.parse_args()[0]

cartodb_settings = None

def main():
    logging.basicConfig(level=logging.DEBUG)
    options = _getoptions()

    # Load up the cartodb settings: we'll need them later.
    global cartodb_settings
    try:
        cartodb_settings = simplejson.loads(
            codecs.open('cartodb.json', encoding='utf-8').read(), 
            encoding='utf-8')
    except Exception as ex:
        logging.error("Could not load CartoDB setting file 'cartodb.json': %s" % ex)
        exit(1)


    if options.source_dir is not None:
        if os.path.isdir(options.source_dir):
            logging.info('Processing source directory: %s' % options.source_dir)
            convertToJSON(options.source_dir)
            sys.exit(0)
        else:
            logging.info('Unable to locate source directory %s.' % options.source_dir)
            sys.exit(1)
    else:
        source_dirs = [x for x in os.listdir('.') if os.path.isdir(x)]

        # Remove some directories used internally.
        source_dirs.remove('logs')
        source_dirs.remove('progress')

        logging.info('Processing source directories: %s' % source_dirs)
        for sd in source_dirs: # For each source dir (e.g., jetz, iucn)
            if not os.path.exists(sd + "/config.yaml"):
                logging.info('Directory "%s": No config.yaml found, ignoring directory.' % sd)
            else:
                convertToJSON(sd)

    logging.info('Processing completed.')

if __name__ == '__main__':
    main()

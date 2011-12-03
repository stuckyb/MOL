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
import hashlib
import logging
from optparse import OptionParser
import os
import random
import simplejson
import shapely.geometry
import subprocess
import sys
import time
from cartodb import CartoDB
from zipfile import ZipFile

from providerconfig import ProviderConfig
from unicodewriter import UnicodeDictReader

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

    # TODO: how?
    # filename = "mol_source_%s.json" % provider_dir
    filename = "mol_source_this.json"
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
            name = collection.getname()

            logging.info("Switching to collection '%s'." % name)

            # This is where we will store all the features.
            features = []

            if os.path.isdir(name):
                # A directory of shapefiles.
                os.chdir(name)

                shapefiles = glob.glob('*.shp')
                for shapefile in shapefiles:
                    # Determine the "name" (filename without extension) of this file.
                    name = shapefile[0:shapefile.index('.shp')]

                    logging.info("Processing shapefile: %s." % name)

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
                        logging.error('Unable to convert %s to GeoJSON - %s' % (name, command))
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

                    features = geojson['features']
                
                # Return to the provider dir.
                os.chdir(original_dir)
                os.chdir(provider_dir)

                os.chdir('..')

            elif os.path.isfile(name) and name.lower().rfind('.csv', len(name) - 4, len(name)) != -1:
                # This is a .csv file! 
                csvfile = open(name, "r")
                reader = UnicodeDictReader(csvfile)

                features = []
                feature_index = 0
                for entry in reader:
                    feature_index += 1
                    feature = {}

                    # As per the spec at http://geojson.org/geojson-spec.html
                    feature['type'] = 'Feature'
                    feature['properties'] = entry

                    lat = entry['Latitude']
                    if not lat:
                        logging.warn("Feature %d has no latitude, ignoring." % feature_index)
                        continue # Ignore features without latitudes.
                    long = entry['Longitude']
                    if not long:
                        logging.warn("Feature %d has no longitude, ignoring." % feature_index)
                        continue # Ignore features without longitudes.

                    feature['geometry'] = {'type': 'Point', 'coordinates': [
                            float(entry['Longitude']),
                            float(entry['Latitude'])
                        ]}
                        # TODO: We assume latitude and longitude (in WGS84) are
                        # present in the columns 'Latitude' and 'Longitude'
                        # respectively.
                    
                        # IMPORTANT TODO: at the moment, we assume the incoming coordinates
                        # are already in WGS84! THIS MIGHT NOT BE TRUE!

                    features.append(feature)

                csvfile.close()

            # Intermediate step: delete previous entries from
            # this provider/collection combination.
            deletePreviousEntries(_getoptions().table_name, collection.get_provider(), collection.get_collection())

            # Step 2.3. For every feature:
            row_count = 0
            for feature in features:
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
                # feature['properties'] = dbf_properties
                # No - let's try uploading to CartoDB without.
                feature['properties'] = new_properties

                # Upload to CartoDB.
                logging.info("\tUploading feature.");
                uploadGeoJSONEntry(feature, _getoptions().table_name)

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
                
            logging.info('%s converted to GeoJSON, %d features processed.' % (name, len(features)))

            # Go back to the provider directory.
            os.chdir(original_dir)
            os.chdir(provider_dir)

        # Zip up the GeoJSON document
        all_json.write("""]}""")
        all_json.close()

        myzip = ZipFile('%s.zip' % filename, 'w')
        # The following statement fails because the filename is
        # not being properly set.
        # myzip.write(filename) # TODO: Fails for big files (4GB)
        myzip.close()

        logging.info("%s written successfully." % filename)

    finally:
        os.chdir(original_dir)

    logging.info("Processing of directory '%s' completed." % provider_dir)

def deletePreviousEntries(table_name, provider, collection):
    """Delete previous database entries refering to this provider/collection combination.

    Arguments:
        table_name: The name of the table to delete rows in.
        provider: The provider whose entries are to be delete.
        collection: The collection within that provider's entries to be deleted.
            Only rows matching BOTH the provider and the collection will be
            deleted.

    Returns: none.
    """
    global cartodb_settings

    cdb = CartoDB(
        cartodb_settings['CONSUMER_KEY'],
        cartodb_settings['CONSUMER_SECRET'],
        cartodb_settings['user'],
        cartodb_settings['password'],
        cartodb_settings['domain']
    )

    # Generate a 'tag', by calculating a SHA-1 hash of the concatenation
    # of the current time (in seconds since the epoch) and the string
    # representation of the property values in the order that Python is
    # using on our system. The 40-hexadecimal character hash digest so
    # produced is prepended with the string 'tag_', since only a valid
    # identifier (starting with a character) may be a tag.
    #
    # So as to have smaller requests, we use 8 character tags (from
    # position 20-28 of the SHA-1 hexdigest).
    tag = "$tag_" + hashlib.sha1( 
        time.time().__str__() + 
        provider + '/' + collection
        ).hexdigest()[20:28] + "$"

    # Delete any previous entries stored under this provider(source)/collection.
    sql = "DELETE FROM %(table_name)s WHERE provider=%(provider)s AND collection=%(collection)s;" % {
        'table_name': table_name,
        'provider': tag + provider + tag,
        'collection': tag + collection + tag
    }
    print "Sending SQL: [%s]" % sql
    print cdb.sql(sql)

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
        cartodb_settings['domain']
    )

    # Get the fields and values ready to be turned into an SQL statement
    properties = entry['properties']
    fields = properties.keys()
    # oauth2 has cannot currently send UTF-8 data in the URL. So we go 
    # back to ASCII at this point. This can be fixed by waiting for oauth2
    # to be fixed (https://github.com/simplegeo/python-oauth2/pull/91 might
    # be a fix), or we can clone our own python-oauth2 and fix that.
    # Another alternative would be to use POST and multipart/form-data,
    # which is probably the better long term solution anyway.
    values = [unicode(v).encode('ascii', 'replace') for v in properties.values()]
        # 'values' will be in the same order as 'fields'
        # as long as there are "no intervening modifications to the 
        # dictionary" [http://docs.python.org/library/stdtypes.html#dict]

    # Determine the geometry for this object, by converting the GeoJSON
    # geometry representation into WKT.
    # geometry = "SRID=4326;" + shapely.geometry.asShape(entry['geometry']).wkb
    geometry = shapely.geometry.asShape(entry['geometry']).wkb.encode('hex')
        # We can use SRID=4326 because we loaded it in that SRID from
        # ogr2ogr.

    # Generate a 'tag', by calculating a SHA-1 hash of the concatenation
    # of the current time (in seconds since the epoch) and the string
    # representation of the property values in the order that Python is
    # using on our system. The 40-hexadecimal character hash digest so
    # produced is prepended with the string 'tag_', since only a valid
    # identifier (starting with a character) may be a tag.
    #
    # So as to have smaller requests, we use 8 character tags (from
    # position 20-28 of the SHA-1 hexdigest).
    tag = "$tag_" + hashlib.sha1( 
        time.time().__str__() + 
        properties.values().__str__()
        ).hexdigest()[20:28] + "$"

    # Turn the fields and values into an SQL statement.
    sql = "INSERT INTO %(table_name)s (the_geom, %(cols)s) VALUES (%(st_multi)s(GeomFromWKB(decode(%(geometry)s, 'hex'), 4326)), %(values)s)" % {
            'table_name': table_name,
            'geometry': tag + geometry + tag,
            'cols': ", ".join(fields),
            'st_multi': "ST_Multi" if (entry['geometry']['type'] == 'Polygon') else "",
            'values': tag + (tag + ", " + tag).join(values) + tag
        }
    print "Sending SQL: [%s]" % sql
    print cdb.sql(sql)

def _getoptions():
    ''' Parses command line options and returns them.'''
    parser = OptionParser()
    parser.add_option('-s', '--source_dir',
                      type='string',
                      dest='source_dir',
                      help='Directory containing source to load.')
    parser.add_option('-t', '--table',
                      type="string",
                      action="store",
                      dest="table_name",
                      default="temp_geodb",
                      help="The CartoDB table to load the data into.")
    parser.add_option("-c", "--cartodb",
                      type="string",
                      action="store",
                      dest="cartodb_json",
                      default="cartodb.json",
                      help="The cartodb.json you wish you read CartoDB settings from.")
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
            source_dir = os.path.normpath(options.source_dir)

            logging.info('Processing source directory: %s' % source_dir)
            convertToJSON(source_dir)
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

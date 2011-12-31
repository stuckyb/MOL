The main program in this folder is 'loader.py', which is responsible
for uploading input files (at the moment, shapefiles) to Map of Life.

You need the following programs to run loader.py:

 - GDAL (http://www.gdal.org/; Mac binaries are available from 
    http://www.kyngchaos.com/software:frameworks)

    ogr2ogr doesn't end up on the path if you use the Mac binaries from
    above; in that case, you will need to add:
        /Library/Frameworks/GDAL.framework/Versions/Current/Programs
    to your path manually.

You will also need the following Python modules:
 - simplejson (http://pypi.python.org/pypi/simplejson/)
 - shapely (http://pypi.python.org/pypi/Shapely)

== Instructions ==
To give you an idea of how simple this process is at the moment, here 
is a step-by-step guide to uploading the NWDSSD dataset to Map of Life.

1. Get the code base set up. This includes installing our customized 
cartodb-python module, which requires some knowledge of Python module 
management. Of course, once our system is completely up and running, 
data providers will have an easy-to-use web interface they can use 
to upload data.

2. Download the dataset as a CSV file. For point occurence data, we 
support any CSV file with a ‘latitude’ and ‘longitude’ field for 
geographical coordinates. Here’s the CSV file we’re using: it is 
identical to the one you can download from GBIF, except for deleting 
an extra comma at the end of the header row. Create a subdirectory 
named ‘nwdssd’ in the ‘mol-data’ directory to store this new dataset.

3. Create a config.yaml file to map the metadata. Here’s the 
config.yaml we used to import NWDSSD data. Note that the latitude and 
longitude fields haven’t been mapped in the config.yaml file; at the 
moment, we require ‘latitude’ and ‘longitude’ fields containing 
decimal values in the input CSV file. Other field names in the 
config.yaml - whether required or optional - need to match the names 
in the MoL field specification.

4. Create a CartoDB table. Our plan is to have one, giant table for 
all point occurrence data while our infrastructure takes shape. At 
the moment, loader.py can upload to any CartoDB table hosted at 
http://www.cartodb.com/. Since this is point data, remember to select 
“point” as the type of geography when creating the table. For the 
rest of this walkthrough, I’ll imagine that you’ve named your new 
table ‘table_name’.

    http://www.flickr.com/photos/ggvaidya/6533913085/in/photostream

5. You will now need to delete the “description” column; this is 
because our code uses its own description column. Deleting the 
description column is easy to do.

    http://www.flickr.com/photos/ggvaidya/6533913151/in/photostream

6. Set up your CartoDB settings in cartodb.json. Use the cartodb.json 
template file included in the source code to write your own. You can 
download your ‘key’ values from your CartoDB account.

7. Run the schema script to create all the necessary columns. The 
command to use is:

    python add-cartodb-columns.py -t table_name

Specify the table name using the ‘-t’ command line option.  If there 
are any errors, these are likely because: 
    (1) there might be an error in your CartoDB settings, or 
    (2) you might have columns from previous runs. In this case, 
        try creating a new, blank table and running this script on 
        that table instead.
    
    http://www.flickr.com/photos/ggvaidya/6533913201/in/photostream
    
8. Run the upload script. The input data is (minimally) validated and 
uploaded to CartoDB. The command to use is:
    
    python loader.py -s nwdssd -t table_name

Remember to specify the table to upload to using the ‘-t’ option. At 
the moment, you also need to specify a single source directory for 
upload (using the ‘-s’ option); a single source directory may contain 
as many datasets as you like, as long as they are all either point 
or polygon data. At the moment, we don’t support a single source 
directory containing both polygon and point data.

    http://www.flickr.com/photos/ggvaidya/6533913289/in/photostream

9. Open the dataset in CartoDB, play around with the visualization, and 
check if it’s okay.
    
    http://www.flickr.com/photos/ggvaidya/6533913377/in/photostream
    http://www.flickr.com/photos/ggvaidya/6533913503/in/photostream

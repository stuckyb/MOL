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

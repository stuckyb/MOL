#!/bin/bash
OGR="/Library/Frameworks/GDAL.framework/Versions/1.8/Programs/ogr2ogr"
R=$(rm -R file_merged.*)
SHPLIST=$(find . -maxdepth 2 -mindepth 2 -type f -name '*.shp')
FIRST="true"
for SHP in $SHPLIST; do
    if [ -n "$FIRST" ]; then
        M=$($OGR file_merged.shp $SHP)
        FIRST=""
    else
        M=$($OGR -update -append file_merged.shp $SHP -nln file_merged)
    fi
done
exit 0
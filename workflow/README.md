# Overview

This document provides information about the MOL workflow for uploading data to Earth Engine and CartoDB.

# Polygon simplification via PostGIS

1) import the shapefiles into a postgre datababse using shp2pgsql using flags -D -d -s 4326
http://postgis.refractions.net/docs/ch04.html#shp2pgsql_usage

2) Project the polygons using ST_Transform. We used Web Mercator (SRID 3857)
http://www.postgis.org/docs/ST_Transform.html
*note: this step is necessary because the ST_SimplifyPreserveTopology only works properly on projected shapes.
(from PostGIS In Action, Obe & Hsu 2011)
"ST_Simplify and ST_SimplifyPreserveTopology assume planar coordinates. Should youuse these functions with long lat data (SRID 4326), the resultant geometry can range from slightly askew to completely goofy. First transform your long lat to a planar coordinate, apply ST_Simplify, and then transform back to long lat."

3) Simplify the polygons using ST_SimplifyPreserveTopology

4) Export the polygons back to a shapefile (to view in ArcGIS) using pgsql2shp
http://postgis.refractions.net/docs/ch04.html#id2627920
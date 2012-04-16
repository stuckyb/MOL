# Overview

This document provides information about the MOL workflow for uploading data to Earth Engine and CartoDB.

# Polygon simplification via PostGIS

1) import the shapefiles into a postgre datababse using shp2pgsql using flags -D -d -s 4326
http://postgis.refractions.net/docs/ch04.html#shp2pgsql_usage

2) Project the polygons using ST_Transform. We used Web Mercator (SRID 3857)
http://www.postgis.org/docs/ST_Transform.html
*note: this step is necessary because the ST_SimplifyPreserveTopology only works properly on projected shapes.

(from PostGIS In Action, Obe & Hsu 2011)
"ST_Simplify and ST_SimplifyPreserveTopology assume planar coordinates. Should you use these functions with long lat data (SRID 4326), the resultant geometry can range from slightly askew to completely goofy. First transform your long lat to a planar coordinate, apply ST_Simplify, and then transform back to long lat."

3) Simplify the polygons using ST_SimplifyPreserveTopology

4) Export the polygons back to a shapefile (to view in ArcGIS) using pgsql2shp
http://postgis.refractions.net/docs/ch04.html#id2627920

# Moving data between CartoDB tables
I used the following SQL statement to copy data from an IUCN shapefile, uploaded to CartoDB as its own table, into the main polygons table.

    INSERT INTO polygons
    --- columns
    (
    areaid,
    polygonid,
    identifier,
    bibliographiccitation,
    collectionid,
    contact,
    type,
    creator,
    datesubmitted,
    rights,
    scientificname,
    title,
    verbatimsrs,
    
    -- calculated
    provider,
    collection,
    filename,
    created_at,
    updated_at,
    
    -- optional
    coverage,     
    distributioncomment,   
    establishmentmeans,
    occurrencestatus,
    polygonname,
    seasonality,
    surveystartdate,
    surveyenddate,
    visible,
    "class",
    the_geom
    )
    
    --- MAPPINGS
    SELECT
    1 AS areaid,
    1 AS polygonid,
    1 AS identifier,
    'IUCN 2009. IUCN Red List of Threatened Species. Version 2009.1. http://www.iucnredlist.org' AS bibliographiccitation,
    'IUCN Red List' AS collectionid,
     'Vineet Katariya <Vineet.Katariya@iucn.org>' AS contact,
    'range' AS type,
    'IUCN' as creator,
    2012 AS datesubmitted,
    'IUCN Red List terms of use as provided online at http://www.iucnredlist.org/info/terms-of-use' AS rights,
    binomial AS scientificname,
    'IUCN Red List™ of Threatened Species' AS title,
    '+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +a=6378137 +b=6378137 +units=m +no_defs' AS verbatimsrs,
    
    -- calculated
    'iucn' as provider,
    'reptiles' as collection,
    binomial as filename,
    created_at AS created_at,
    updated_at AS updated_at,
    
    -- optional
    'Global' AS coverage,     
    dist_comm AS distributioncomment,   
    origin AS establishmentmeans,
    presence AS occurrencestatus,
    island AS polygonname,
    seasonal AS seasonality,
    year AS surveystartdate,
    year AS surveyenddate,
    TRUE as visible,
    'reptilia' AS "class",
    the_geom AS the_geom
    
    FROM iucn_reptiles_less67;

I hope it will be of some use to you.
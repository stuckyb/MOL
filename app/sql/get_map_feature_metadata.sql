-- get_map_feature_metadata(float, float, int, int, text)
-- Function to feature metadata json a singlerecord.
-- Params:
--    lon: longitude of map click
--    lat: latitude of map click
--    radius: radius in pixels
--    zoom: Google maps zoom level
--    layers: An array of layer ids to search, comma seperated.
-- Returns:
---   In each response row, json text for a layer_features object for each requested layer

--	{"layer--puma_concolor--points--gbif--gbif_taxa_geom": [
--		{
--		title: value, 
--		title1, value2, 
--		...
--		},
--		{title: value, 
--		title1, value2, 
--		...} 
--	]


DROP function get_map_feature_metadata(float, float, int, int, text);
CREATE FUNCTION get_map_feature_metadata(float, float, int, int, text)
	RETURNS TABLE(layer_features text)
AS
$$

    DECLARE sql TEXT;
    DECLARE table_name TEXT;
    DECLARE cartodb_id INT;
    DECLARE metadata RECORD; -- a feature_metadata table record
    DECLARE data RECORD; -- a feature_metadata table record
    DECLARE taxo RECORD; -- a taxonomy table record
    DECLARE geom RECORD; -- a geometry table record
    DECLARE layer_results RECORD; -- features for a layer
    DECLARE json_string text; -- contents of a SQL CONCAT() that creates the json for wax info windows
    DECLARE metadata_records text[]; 
    DECLARE map_radius float;
    DECLARE dataset_id text;
    DECLARE scientificname text;
    DECLARE layer_id text;
    DECLARE index int;
    BEGIN
	-- we want a radius in web_mercator for the pixel-click radius.
	map_radius=(CAST($3 as FLOAT)*40075000/(256*(2^$4)));

        FOREACH layer_id IN ARRAY string_to_array($5,',') LOOP
		dataset_id=split_part(layer_id,TEXT('--'), 5); --Layer ID looks like "layer--puma_concolor--points--gbif--gbif_taxa_geom"
		scientificname=REPLACE(split_part(layer_id,TEXT('--'), 2),'_', ' ');
		scientificname:=upper(substring(scientificname from 1 for 1)) || lower(substring(scientificname from 2));
		sql = 'SELECT * from feature_metadata WHERE data_table = ''' || dataset_id || ''' ORDER BY "order" asc';
	     	json_string = '';
		FOR metadata in EXECUTE sql LOOP
		    IF json_string <> '' THEN
		        json_string = json_string || ','','',';
		    END IF;    
		    json_string = CONCAT(
			json_string, 
			'''"', 
			metadata.title, 
			'":"'',', 
			(CASE WHEN 
				metadata.field is not null and metadata.field <> '' 
			THEN 
				metadata.field || ',' 
			ELSE 
				''''',' 
			END),
			'''"'''
		    );  
		END LOOP;
		sql = 'SELECT * from data_registry WHERE table_name = ''' || dataset_id || ''' LIMIT 1';
		EXECUTE sql INTO data;
		sql = '';
		IF data.type = 'range' or data.type = 'points' THEN              
		    -- regular data table
		    sql = 'CREATE TEMPORARY TABLE layer_results AS ' ||
			  'SELECT feature_metadata FROM ' ||
				  ' (SELECT CONCAT(''{'',' || json_string || ',''}'') as feature_metadata, ' ||
		                  ' the_geom_webmercator as the_geom_webmercator  ' || 
				  ' FROM ' || data.table_name ||  
				  ' WHERE ' || data.scientificname || ' = '''|| scientificname ||''') sl ' ||
                          ' WHERE ' ||
			  '  ST_DWithin(the_geom_webmercator,ST_Transform' ||
                	  '  (ST_PointFromText(''POINT(' || $1 ||' ' || $2 || ')'',4326),3857),' || map_radius ||')' ;    
		ELSIF data.type = 'taxogeooccchecklist' THEN 		
		    -- GBIF!
		    sql = 'CREATE TEMPORARY TABLE layer_results AS ' ||
			  'SELECT feature_metadata FROM (SELECT CONCAT(''{'',' || json_string || ',''}'') as feature_metadata, g.the_geom_webmercator as the_geom_webmercator ' ||
			  ' FROM ' || data.table_name || ' d ' ||
		          ' JOIN ' || data.taxo_table || ' t ON ' ||
		          '   d.' || data.species_id || ' = t.' || data.species_link_id ||
		          ' JOIN ' || data.geom_table || ' g ON ' ||
		          '   d.' || data.geom_id || ' = g.' || data.geom_link_id  ||
			  ' JOIN ' || data.occurrence_table || ' o ON ' ||
			  '   (d.' || data.geom_id || ' = o.' || data.occurrence_geom_id || 
			  ' 	AND ' || ' d.'|| data.species_id || ' = o.' || data.species_link_id || ')' ||
		          ' WHERE t.' || data.scientificname || ' = '''|| scientificname ||''') sl where ' ||
                          '    ST_DWithin(the_geom_webmercator,ST_Transform' ||
                	  '    (ST_PointFromText(''POINT(' || $1 ||' ' || $2 || ')'',4326),3857),' || map_radius ||')';   
		ELSIF data.type = 'taxogeochecklist' THEN 		
		    -- Checklist with a seperate geometry table and taxonomy table
		    sql = 'CREATE TEMPORARY TABLE layer_results AS ' ||
			  'SELECT feature_metadata FROM (SELECT CONCAT(''{'',' || json_string || ',''}'') as feature_metadata, g.the_geom_webmercator as the_geom_webmercator ' ||
			  ' FROM ' || data.table_name || ' d ' ||
		          ' JOIN ' || data.taxo_table || ' t ON ' ||
		          '   d.' || data.species_id || ' = t.' || data.species_link_id ||
		          ' JOIN ' || data.geom_table || ' g ON ' ||
		          '   d.' || data.geom_id || ' = g.' || data.geom_link_id  ||
		          ' WHERE ' || data.scientificname || ' = '''|| scientificname ||''') sl WHERE ST_DWithin(the_geom_webmercator,ST_Transform' ||
                	  '    (ST_PointFromText(''POINT(' || $1 ||' ' || $2 || ')'',4326),3857),' || map_radius ||')' ;  
		ELSIF data.type = 'geochecklist' THEN 
		    -- Checklist with a seperate geometry table but no taxonomy table
		    sql = 'CREATE TEMPORARY TABLE layer_results AS ' ||
			  'SELECT feature_metadata FROM (SELECT CONCAT(''{'',' || json_string || ',''}'') as feature_metadata, g.the_geom_webmercator as the_geom_webmercator ' ||
			  '  FROM ' || data.table_name || ' d ' ||
		          ' JOIN ' || data.geom_table || ' g ON ' ||
		          '   d.' || data.geom_id || ' = g.' || data.geom_link_id  ||
			  ' WHERE ' || data.scientificname || ' = '''|| scientificname ||''') sl WHERE ST_DWithin(the_geom_webmercator,ST_Transform' ||
                	  '    (ST_PointFromText(''POINT(' || $1 ||' ' || $2 || ')'',4326),3857),' || map_radius ||') ';   
		ELSE
			--nada
		END IF; 
		--RETURN json_string;
		EXECUTE sql;
	        sql = 'SELECT CONCAT(''{"' || layer_ID || '":['',array_to_string(array_agg(layer_results.feature_metadata),'',''),'']}'') from layer_results';
		RETURN QUERY EXECUTE sql;
		DROP TABLE layer_results;
	END LOOP;
    END

$$  language plpgsql;


--get_mol_tile(text, text, text)
-- Function to get tile data (the_geom_webmercator and cartodb_id) for a single MOL layer.
-- Params:	
--	provider: the data source
--	type: the data type
--	scientificname: latin name of the species
--	(optional) table_name: the table name to search for data
-- Returns:
-- 	cartodb_id: data table name + cartodb_id within data table.
--	type: range, points, or checklist
--	provider: the data source
--	seasonality: seasonality in source data format (some variety of int -- needs to mapped to mol seasonality)
--	the_geom_webmercator: A 2D geometry column in the web mercator projection -- MultiPolygon or Point

DROP function get_mol_tile(text, text, text, text);
CREATE FUNCTION get_mol_tile(text, text, text, text)
	RETURNS TABLE(cartodb_id text, type text, provider text, seasonality int, the_geom_webmercator geometry) 
AS
$$
  DECLARE sql TEXT;
  DECLARE data RECORD; -- a data table record
  DECLARE taxo RECORD; -- a taxonomy table record
  DECLARE geom RECORD; -- a geometry table record 
  BEGIN
      --assemble some sql to get the tables we want. a a table was passed as a paramater, use that 
      sql = 'SELECT * from data_registry WHERE provider = ''' || $1 || ''' and type = ''' || $2 || '''' ||
     CASE WHEN $4 <> '' THEN 
	'  and table_name = ''' || $4 || ''''
	ELSE ''
     END;
      FOR data in EXECUTE sql LOOP
         IF data.type = 'range' or data.type = 'points' THEN
                sql = ('SELECT CONCAT('''|| data.table_name ||'-'', cartodb_id) as cartodb_id, TEXT('''||data.type||''') as type, TEXT('''||data.provider||''') as provider, CAST(' || data.seasonality || ' as int) as seasonality, ' || data.geometry_field || ' FROM ' || data.table_name || ' WHERE ' ||  data.scientificname || ' = ''' || $3 || '''');
                 RETURN QUERY EXECUTE sql;
         ELSIF data.type = 'checklist' and data.taxo_table <> Null and data.geom_table <> Null THEN 		
		-- Get the sciname and species_id field names from the checklist taxonomy table
	        sql = 'SELECT d.scientificname, d.species_id INTO taxo FROM data_registry d WHERE d.table_name = ''' || data.taxo_table  || ''' LIMIT 1';
	        EXECUTE sql;
		-- Get the geom_id field from the checklist geometry table
		sql = 'SELECT d.geom_id INTO geom FROM data_registry d WHERE table_name = ''' || data.geom_table || ''' LIMIT 1';
	        EXECUTE sql;
                -- Glue them all together
		sql = ' SELECT ' ||
	          ' d.cartodb_id as data_id, ' ||   
                  ' g.' || geom.geom_id || ' as geom_id, ' || 
                  ' t.' || taxo.species_id || ' as species_id, ' ||
                  ' g.the_geom_webmercator as the_geom_webmercator ' ||   
                  ' FROM ' || data.table_name || ' d ' ||
                  ' JOIN ' || data.taxo_table || ' t ON ' ||
                  '   d.' || data.species_id || ' = t.' || taxo.species_id ||
                  ' JOIN ' || data.geom_table || ' g ON ' ||
                  '   d.' || data.geom_id || ' = g.' || geom.geom_id  ||
		  ' WHERE t.' || taxo.scientificname || ' = $3'; 
		RETURN QUERY EXECUTE sql;
	  ELSIF data.type = 'checklist' and data.taxo_table = Null and data.scientificname <> Null THEN 
		-- Get the geom_id field from the checklist geometry table
		sql = 'SELECT d.geom_id INTO geom FROM data_registry d WHERE table_name = ''' || data.geom_table || ''' LIMIT 1';
	        EXECUTE sql;
                -- Glue them all together
		sql = ' SELECT ' || 
                  '   d.' || taxo.scientificname || ', ' ||
                  '   TEXT(''' || data.type || ''') as type, ' || 
                  '   TEXT(''' || data.provider || ''') as provider, ' ||
                  '   TEXT(''' || data.table_name || ''') as data_table, ' ||
                  '   ST_Extent(g.the_geom) as extent, ' ||
                  '   count(*) as feature_count ' ||
                  ' FROM ' || data.table_name || ' d ' ||
                  ' JOIN ' || data.geom_table || ' g ON ' ||
                  '   d.' || data.geom_id || ' = g.' || geom.geom_id  ||
		  ' where d.' || data.scientificname || ' = $3 ';
		RETURN QUERY EXECUTE sql;
           ELSE
                -- We got nuttin'
	  END IF;
       END LOOP;
    END
$$  language plpgsql;

--get_mol_metdata(texttext, text, text)
-- Function to get tile data (the_geom_webmercator and cartodb_id) for a single MOL layer.
-- Params:
--	table_name-cartodb_id: data table name + cartodb_id	
-- Returns:
--- 	
DROP function get_mol_metadata(text);
CREATE FUNCTION get_mol_metadata(text)
	RETURNS text
AS
$$
  DECLARE sql TEXT;
  DECLARE table_name TEXT;
  DECLARE cartodb_id INT;
  DECLARE data RECORD; -- a data table record
  DECLARE taxo RECORD; -- a taxonomy table record
  DECLARE geom RECORD; -- a geometry table record
  DECLARE result RECORD; -- the metadata record
  DECALRE metadata_json; -- sql to output metadata as json 
  BEGIN
      table_name = split_part($1,'-', 1);
      cartodb_id = CAST(split_part($1,'-', 2) as Int);
      metadata_json = '''{''' 
      sql = 'SELECT * from data_registry WHERE table_name = ''' || table_name || '''';
      FOR data in EXECUTE sql LOOP
         -- basic range map or point data
         IF data.type = 'range' or data.type = 'points' THEN
                sql = ('SELECT ' || data.metadata_fields ||' FROM ' || data.table_name || '  WHERE cartodb_id = ' ||  cartodb_id );
	 -- Checklist with a seperate geometry table and taxonomy table
         ELSIF data.type = 'checklist' and data.taxo_table <> Null and data.geom_table <> Null THEN 		
		-- Get the sciname and species_id field names from the checklist taxonomy table
	        sql = 'SELECT d.scientificname, d.species_id INTO taxo FROM data_registry d WHERE d.table_name = ''' || data.taxo_table  || ''' LIMIT 1';
	        EXECUTE sql;
		-- Get the geom_id field from the checklist geometry table
		sql = 'SELECT d.geom_id INTO geom FROM data_registry d WHERE table_name = ''' || data.geom_table || ''' LIMIT 1';
	        EXECUTE sql;
                -- Glue them all together
		sql = 'SELECT ' || data.metadata_fields || 
                  ' FROM ' || data.table_name || ' d ' ||
                  ' JOIN ' || data.taxo_table || ' t ON ' ||
                  '   d.' || data.species_id || ' = t.' || taxo.species_id ||
                  ' JOIN ' || data.geom_table || ' g ON ' ||
                  '   d.' || data.geom_id || ' = g.' || geom.geom_id  ||
		  ' WHERE d.cartodb_id = ' || cartodb_id; 

	  -- Checklist with a seperate geometry table but no taxonomy table
	  ELSIF data.type = 'checklist' and data.taxo_table = Null and data.scientificname <> Null THEN 
		-- Get the geom_id field from the checklist geometry table
		sql = 'SELECT d.geom_id INTO geom FROM data_registry d WHERE table_name = ''' || data.geom_table || ''' LIMIT 1';
	        EXECUTE sql;
                -- Glue them all together
		sql = 'SELECT ' || 
                  '   d.' || taxo.scientificname || ', ' ||
                  '   TEXT(''' || data.type || ''') as type, ' || 
                  '   TEXT(''' || data.provider || ''') as provider, ' ||
                  '   TEXT(''' || data.table_name || ''') as data_table, ' ||
                  '   ST_Extent(g.the_geom) as extent, ' ||
                  '   count(*) as feature_count ' ||
                  '  FROM ' || data.table_name || ' d ' ||
                  ' JOIN ' || data.geom_table || ' g ON ' ||
                  '   d.' || data.geom_id || ' = g.' || geom.geom_id  ||
		  ' where d.cartodb_id = ' || cartodb_id; 
           ELSE
                -- We got nuttin'
	  END IF;
          EXECUTE sql INTO result;
	  RETURN result;
       END LOOP;
    END
$$  language plpgsql;

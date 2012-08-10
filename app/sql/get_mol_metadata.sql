--get_mol_metdata(text)
-- Function to get tile data (the_geom_webmercator and cartodb_id) for a single MOL layer.
-- Params:
--	table_name-cartodb_id: data table name + cartodb_id	
-- Returns:
--	
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
  DECLARE metadata_json text; -- SQL tha create the metadata json
  DECLARE metadata_records text[];
  DECLARE index int;
  
  BEGIN
      table_name = split_part($1,'-', 1);
      cartodb_id = CAST(split_part($1,'-', 2) as Int);
      sql = 'SELECT * from data_registry WHERE table_name = ''' || table_name || '''';
      FOR data in EXECUTE sql LOOP
         --split the metadata fields up into title: value json
      	 metadata_json =  '';
      	 index=1;
         metadata_records = string_to_array(data.metadata_fields,',');
         WHILE index < (array_length(metadata_records,1)+1) LOOP
         	IF metadata_json = '' THEN
         		metadata_json = 'CONCAT(''{"' || split_part(metadata_records[index],':',1) || '":"'',' || split_part(metadata_records[index],':',2) || ',''"''';
         	ELSE 
         		metadata_json = metadata_json || ','',"' || split_part(metadata_records[index],':',1) || '":"'',' || split_part(metadata_records[index],':',2) || ',''"';
         	END IF;
         	index:=index+1;
         END LOOP;
         metadata_json = metadata_json || '}'')';
         -- basic range map or point data
         IF data.type = 'range' or data.type = 'points' THEN
                sql = ('SELECT ' || metadata_json ||' as mol_metadata FROM ' || data.table_name || '  WHERE cartodb_id = ' ||  cartodb_id);
	 -- Checklist with a seperate geometry table and taxonomy table
         ELSIF data.type = 'ecoregion' THEN 		
                -- Glue them all together
		sql = 'SELECT ' || metadata_json || 
                  ' FROM ' || data.table_name || ' d ' ||
                  ' JOIN ' || data.taxo_table || ' t ON ' ||
                  '   d.' || data.species_id || ' = t.' || data.species_link_id ||
                  ' JOIN ' || data.geom_table || ' g ON ' ||
                  '   d.' || data.geom_id || ' = g.' || data.geom_link_id  ||
		  ' WHERE d.cartodb_id = ' || cartodb_id; 

	  -- Checklist with a seperate geometry table but no taxonomy table
	  ELSIF data.type = 'protectedarea' THEN 
		-- Get the geom_id field from the checklist geometry table
		sql = 'SELECT d.geom_id INTO geom FROM data_registry d WHERE table_name = ''' || data.geom_table || ''' LIMIT 1';
	        EXECUTE sql;
                -- Glue them all together
		sql = 'SELECT ' || metadata_json || ' as mol_metadata ' ||
                  '  FROM ' || data.table_name || ' d ' ||
                  ' JOIN ' || data.geom_table || ' g ON ' ||
                  '   d.' || data.geom_id || ' = g.' || data.geom_link_id  ||
		  ' where d.cartodb_id = ' || cartodb_id; 
           ELSE
                -- We got nuttin'
	  END IF;
      EXECUTE sql INTO result;
	  RETURN TEXT(result.mol_metadata);
       END LOOP;
    END
$$  language plpgsql;

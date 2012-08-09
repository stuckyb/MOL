-- Function to get all MOL layers (checklist and polygon), cache this result in layers_metadata
DROP function get_dashboard_counts();
CREATE FUNCTION get_dashboard_counts() 
	RETURNS TABLE(provider text, type text, class text, species_count bigint, feature_count bigint) 
AS
$$
  DECLARE sql TEXT;
  DECLARE data RECORD; -- a data table record
  DECLARE taxo RECORD; -- a taxonomy table record
  DECLARE geom RECORD; -- a geometry table record 
  BEGIN
      FOR data in (SELECT * from data_registry) LOOP
	 -- Just count species in the table, all the same taxa
         IF data.type = 'range' and data.taxa <>  THEN
                sql = 'SELECT ' || 
                  'TEXT(''' || data.provider || ''') as provider, ' ||
	          'TEXT(''' || data.type || ''') as type, ' ||
		  'count(DISTINCT '|| data.scientificname || ') as species_count, ' ||
                  'count(*) as feature_count FROM ' || data.table_name; 
                RETURN QUERY EXECUTE sql;
         ELSIF data.type = 'checklist' and data.taxo_table <> Null THEN 		
		-- Get the sciname and species_id field names from the checklist taxonomy table
	        sql = 'SELECT d.scientificname, d.species_id INTO taxo FROM data_registry d WHERE d.table_name = ' || data.taxo_table  || ' LIMIT 1';
	        EXECUTE sql;
		-- Get the geom_id field from the checklist geometry table
		sql = 'SELECT d.geom_id INTO geom FROM data_registry d WHERE table_name = ' || data.geom_table || 'LIMIT 1';
	        EXECUTE sql;
                -- Glue them all together
		sql = ' SELECT ' || 
                  '   t.' || taxo.scientificname || ', ' ||
                  '   TEXT(''' || data.type || ''') as type, ' || 
                  '   TEXT(''' || data.provider || ''') as provider, ' ||
                  '   TEXT(''' || data.table_name || ''') as data_table, ' ||
                  '   ST_Extent(g.the_geom) as extent, ' ||
                  '   count(*) as feature_count ' ||
                  ' FROM ' || data.table_name || ' d ' ||
                  ' JOIN ' || data.taxo_table || ' t ON ' ||
                  '   d.' || data.species_id || ' = t.' || taxo.species_id ||
                  ' JOIN ' || data.geom_table ' g ON ' ||
                  '   d.' || data.geom_id || ' = g.' || geom.geom_id  ||
		  ' GROUP BY t.' || taxo.scientificname; 
		RETURN QUERY EXECUTE sql;
	  ELSIF data.type = 'checklist' and data.taxo_table = Null and data.scientificname <> Null THEN 
		-- Get the geom_id field from the checklist geometry table
		sql = 'SELECT d.geom_id INTO geom FROM data_registry d WHERE table_name = ' || data.geom_table || 'LIMIT 1';
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
                  ' JOIN ' || data.geom_table ' g ON ' ||
                  '   d.' || data.geom_id || ' = g.' || geom.geom_id  ||
		  ' GROUP BY d.' || data.scientificname; 
		RETURN QUERY EXECUTE sql;
             ELSE
                -- We got nuttin'
	  END IF;
       END LOOP;
    END
$$  language plpgsql;

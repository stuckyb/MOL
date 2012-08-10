-- Function to get all MOL layers (checklist and polygon), cache this result in layers_metadata
DROP function get_mol_layers();
CREATE FUNCTION get_mol_layers() 
	RETURNS TABLE(scientificname text, type text, provider text, data_table text, extent box2d, feature_count bigint) 
AS
$$
  DECLARE sql TEXT;
  DECLARE data RECORD; -- a data table record
  BEGIN
      FOR data in (SELECT * from data_registry) LOOP
         IF data.type = 'range' THEN
                sql = 'SELECT ' || 
                  data.scientificname || ', ' ||
                  'TEXT(''' || data.type || ''') as type, ' ||
                  'TEXT(''' || data.provider || ''') as provider, ' ||
                  'TEXT(''' || data.table_name || ''') as data_table, ' ||
                  'ST_Extent(the_geom) as extent, ' || 
                  'count(*) as feature_count  FROM ' || data.table_name || ' GROUP BY ' || data.scientificname;                
         ELSIF data.type = 'checklist' and data.taxo_table <> '' THEN 		
                -- Glue them all together
		sql = ' SELECT ' || 
                  '   t.' || data.scientificname || ', ' ||
                  '   TEXT(''' || data.type || ''') as type, ' || 
                  '   TEXT(''' || data.provider || ''') as provider, ' ||
                  '   TEXT(''' || data.table_name || ''') as data_table, ' ||
                  '   ST_Extent(g.the_geom) as extent, ' ||
                  '   count(*) as feature_count ' ||
                  ' FROM ' || data.table_name || ' d ' ||
                  ' JOIN ' || data.taxo_table || ' t ON ' ||
                  '   d.' || data.species_id || ' = t.' || data.species_link_id ||
                  'JOIN ' || data.geom_table || ' g ON' ||
                   data.geom_id || ' = g.' || data.geom_link_id  ||
		  ' GROUP BY t.' || data.scientificname; 
	  ELSIF data.type = 'checklist' and data.taxo_table = '' and data.scientificname <> '' THEN 
		
		sql = ' SELECT ' || 
                  '   d.' || data.scientificname || ', ' ||
                  '   TEXT(''' || data.type || ''') as type, ' || 
                  '   TEXT(''' || data.provider || ''') as provider, ' ||
                  '   TEXT(''' || data.table_name || ''') as data_table, ' ||
                  '   ST_Extent(g.the_geom) as extent, ' ||
                  '   count(*) as feature_count ' ||
                  ' FROM ' || data.table_name || ' d ' ||
                  ' JOIN ' || data.geom_table ' g ON ' ||
                  '   d.' || data.geom_id || ' = g.' || data.geom_link_id  ||
		  ' GROUP BY d.' || data.scientificname; 
	  ELSE
                -- We got nuttin'
	  END IF;
          RETURN QUERY EXECUTE sql;
       END LOOP;
    END
$$  language plpgsql;

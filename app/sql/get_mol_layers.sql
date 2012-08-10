-- Function to get all MOL layers (checklist and polygon), cache this result in layers_metadata
DROP function get_mol_layers(text);
CREATE FUNCTION get_mol_layers(text) 
	RETURNS text --TABLE(scientificname text, type text, provider text, data_table text, extent box2d, feature_count bigint) 
AS
$$
  DECLARE sql TEXT;
  DECLARE data RECORD; -- a data table record
  BEGIN
      FOR data in (SELECT * from data_registry d WHERE d.type = $1) LOOP
         IF data.type = 'range' THEN
                sql = 'SELECT ' || 
                  data.scientificname || ', ' ||
                  'TEXT(''' || data.type || ''') as type, ' ||
                  'TEXT(''' || data.provider || ''') as provider, ' ||
                  'TEXT(''' || data.table_name || ''') as data_table, ' ||
                  'ST_Extent(the_geom) as extent, ' || 
                  'count(*) as feature_count  FROM ' || data.table_name || ' GROUP BY ' || data.scientificname;                
         ELSIF data.type = 'ecoregion' THEN 		
                -- Glue them all together
		sql = ' SELECT ' || 
                  '   t.' || data.scientificname || ' as scientificname, ' ||
                  '   TEXT(''d.' || data.type || ''') as type, ' || 
                  '   TEXT(''d.' || data.provider || ''') as provider, ' ||
                  '   TEXT(''d.' || data.table_name || ''') as data_table, ' ||
                  '   ST_Extent(g.the_geom) as extent, ' ||
                  '   count(*) as feature_count ' ||
                  ' FROM ' || data.table_name || ' d ' ||
                  ' JOIN ' || data.taxo_table || ' t ON ' ||
                  '   d.' || data.species_id || ' = t.' || data.species_link_id ||
                  ' JOIN ' || data.geom_table || ' g ON' ||
                   data.geom_id || ' = g.' || data.geom_link_id  ||
		  ' GROUP BY t.' || data.scientificname; 
	  ELSIF data.type = 'protectedarea' THEN 		
		sql = ' SELECT ' || 
                  '   d.' || data.scientificname || ' as scientificname, ' ||
                  '   TEXT(''d.' || data.type || ''') as type, ' || 
                  '   TEXT(''d.' || data.provider || ''') as provider, ' ||
                  '   TEXT(''d.' || data.table_name || ''') as data_table, ' ||
                  '   ST_Extent(g.the_geom) as extent, ' ||
                  '   count(*) as feature_count ' ||
                  ' FROM ' || data.table_name || ' d ' ||
                  ' JOIN ' || data.geom_table ' g ON ' ||
                  '   d.' || data.geom_id || ' = g.' || data.geom_link_id  ||
		  ' GROUP BY d.' || data.scientificname; 
	  ELSE
                -- We got nuttin'
	  END IF;
          --RETURN QUERY EXECUTE sql;
	  RETURN sql;          
       END LOOP;

    END
$$  language plpgsql;

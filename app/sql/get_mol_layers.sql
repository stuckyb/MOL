-- Function to get all MOL layers (checklist and polygon), cache this result in layers_metadata
DROP function get_mol_layers();
CREATE FUNCTION get_mol_layers() 
	--RETURNS TABLE(scientificname text, type text, product_type text, provider text, data_table text, extent box2d, feature_count bigint) 
	RETURNS TABLE(sql text)
AS
$$
  DECLARE sql TEXT;
  DECLARE data RECORD; -- a data table record
  BEGIN
      FOR data in SELECT * from data_registry LOOP
         IF data.type = 'range' THEN
                sql = 'SELECT ' || 
                  data.scientificname || ' as scientificname, ' ||
                  ' TEXT(''' || data.type || ''') as data_type, ' ||
                  ' TEXT(''' || data.product_type || ''') as type, ' ||
                  ' TEXT(''' || data.provider || ''') as provider, ' ||
                  ' TEXT(''' || data.table_name || ''') as data_table, ' ||
                  ' ST_Extent(the_geom) as extent, ' || 
                  ' count(*) as feature_count  FROM ' || data.table_name || ' d '|| 
		  ' GROUP BY ' || data.scientificname;                
         ELSIF data.type = 'ecoregion'  or data.type = 'taxogeochecklist' THEN 		
                -- Glue them all together
		sql = ' SELECT ' || 
                  '   ' || data.scientificname || ' as scientificname, ' ||
                  ' TEXT(''' || data.type || ''') as data_type, ' ||
                  ' TEXT(''' || data.product_type || ''') as type, ' ||
                  '   TEXT(''' || data.provider || ''') as provider, ' ||
                  '   TEXT(''' || data.table_name || ''') as data_table, ' ||
                  '   ST_Extent(g.the_geom) as extent, ' ||
                  '   count(*) as feature_count ' ||
                  ' FROM ' || data.table_name || ' d ' ||
                  ' JOIN ' || data.taxo_table || ' t ON ' ||
                  '   d.' || data.species_id || ' = t.' || data.species_link_id ||
                  ' JOIN ' || data.geom_table || ' g ON ' ||
                  '   d.' || data.geom_id || ' = g.' || data.geom_link_id  ||
		  ' GROUP BY ' || data.scientificname; 
	  ELSIF data.type = 'protectedarea' or data.type = 'geochecklist'  THEN 		
		sql = ' SELECT ' || 
                  '   ' || data.scientificname || ' as scientificname, ' ||
                  ' TEXT(''' || data.type || ''') as data_type, ' ||
                  ' TEXT(''' || data.product_type || ''') as type, ' ||
                  '   TEXT(''' || data.provider || ''') as provider, ' ||
                  '   TEXT(''' || data.table_name || ''') as data_table, ' ||
                  '   ST_Extent(g.the_geom) as extent, ' ||
                  '   count(*) as feature_count ' ||
                  ' FROM ' || data.table_name || ' d ' ||
                  ' JOIN ' || data.geom_table || ' g ON ' ||
                  '   d.' || data.geom_id || ' = g.' || data.geom_link_id  ||
		  ' GROUP BY ' || data.scientificname; 
	  ELSIF  data.type = 'taxogeooccchecklist'  THEN 
	        sql = ' SELECT ' || 
                  '   ' || data.scientificname || ' as scientificname, ' ||
                  ' TEXT(''' || data.type || ''') as data_type, ' ||
                  ' TEXT(''' || data.product_type || ''') as type, ' ||
                  '   TEXT(''' || data.provider || ''') as provider, ' ||
                  '   TEXT(''' || data.table_name || ''') as data_table, ' ||
                  '   ST_Extent(g.the_geom) as extent, ' ||
                  '   count(*) as feature_count ' ||
                  ' FROM ' || data.table_name || ' d ' ||
                  ' JOIN ' || data.taxo_table || ' t ON ' ||
                  '   d.' || data.species_id || ' = t.' || data.species_link_id ||
                  ' JOIN ' || data.geom_table || ' g ON ' ||
                  '   d.' || data.geom_id || ' = g.' || data.geom_link_id  ||
		  ' JOIN ' || data.occurrence_table || ' o ON ' ||
	          '   d.' || data.geom_id || ' = o.' || data.occurrence_geom_id ||
		  ' GROUP BY ' || data.scientificname; 
	  END IF;
          --RETURN QUERY EXECUTE sql;
	  RETURN QUERY SELECT TEXT(sql);          
       END LOOP;

    END
$$  language plpgsql;

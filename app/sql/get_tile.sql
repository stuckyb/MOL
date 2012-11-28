--get_tile(text, text, text)
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
--	seasonality: an iucn seasonality code
--	presence: an iucn presence code
--	the_geom_webmercator: A 2D geometry column in the web mercator projection -- MultiPolygon or Point

DROP function get_tile(text, text, text, text);
CREATE FUNCTION get_tile(text, text, text, text)
	RETURNS TABLE(cartodb_id text, type text, provider text, seasonality int, presence int, the_geom_webmercator geometry) 
AS
$$

  DECLARE sql TEXT;
  DECLARE data RECORD; -- a data table record
  BEGIN
      --assemble some sql to get the tables we want. a a table was passed as a paramater, use that 
      sql = 'SELECT * from data_registry WHERE provider = ''' || $1 || ''' and type = ''' || $2 || '''' ||
      CASE WHEN $4 <> '' THEN 
	'  or table_name = ''' || $4 || ''''
	ELSE ''
      END;
      FOR data in EXECUTE sql LOOP
         IF data.type = 'range' or data.type = 'points' THEN
                sql := 'SELECT ' ||
		  ' CONCAT('''|| data.table_name ||'-'', cartodb_id) as cartodb_id, ' ||
                  ' TEXT('''||data.product_type||''') as type, TEXT('''||data.provider||''') as provider, ' ||
                  ' CAST(' || data.seasonality || ' as int) as seasonality, ' || 
                  ' CAST(' || data.presence || ' as int) as presence, ' || 
                  data.geometry_field || 
                  ' FROM ' || data.table_name || 
                  ' WHERE ' ||  
                  data.scientificname || ' = ''' || $3 || '''';               
         ELSIF data.type = 'taxogeochecklist' or data.type = 'taxogeooccchecklist' THEN 		
                sql := 'SELECT ' ||
		  ' DISTINCT CONCAT('''|| data.table_name || '-'', d.cartodb_id) as cartodb_id, ' ||
                  ' TEXT('''||data.product_type||''') as type, TEXT('''||data.provider||''') as provider, ' ||
                  ' CAST(' || data.seasonality || ' as int) as seasonality, ' || 
                  ' CAST(' || data.presence || ' as int) as presence, ' || 
                  ' g.' || data.geometry_field || 
                  ' FROM ' || data.table_name || ' d ' ||
	          ' JOIN ' || data.geom_table || ' g ON ' ||
                  '   d.' || data.geom_id || ' = g.' || data.geom_link_id  ||
                  ' JOIN ' || data.taxo_table || ' t ON ' ||
                  '   d.' || data.species_id || ' = t.' || data.species_link_id ||
		  ' WHERE ' || data.scientificname || ' = ''' || $3 || ''''; 
	  ELSIF data.type = 'geochecklist' THEN 
		sql := 'SELECT ' ||
		  ' DISTINCT CONCAT('''|| data.table_name ||'-'', d.cartodb_id) as cartodb_id, ' ||
                  ' TEXT('''||data.product_type||''') as type, TEXT('''||data.provider||''') as provider, ' ||
                  ' CAST(' || data.seasonality || ' as int) as seasonality, ' || 
                  ' CAST(' || data.presence || ' as int) as presence, ' || 
                  ' g.' || data.geometry_field || 
                  ' FROM ' || data.table_name || ' d ' ||
                  ' JOIN ' || data.geom_table || ' g ON ' ||
                  '   d.' || data.geom_id || ' = g.' || data.geom_link_id  ||
		  ' where ' || data.scientificname || ' = ''' ||  $3 || '''';
           ELSE
                -- We got nuttin'
	  END IF;
	  --RETURN sql;
          RETURN QUERY EXECUTE sql;
       END LOOP;
    END

$$  language plpgsql;

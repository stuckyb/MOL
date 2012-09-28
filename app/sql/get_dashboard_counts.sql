-- Function to get all MOL layers (checklist and polygon), cache this result in layers_metadata
DROP function get_dashboard_metadata();
CREATE FUNCTION get_dashboard_metadata() 
	RETURNS TABLE(provider text, type text, provider_id text, type_id text, taxa text, data_table text, species_count bigint, feature_count bigint) 
AS
$$
  DECLARE sql TEXT;
  DECLARE data RECORD; -- a data table record
  DECLARE provider RECORD;
  DECLARE type RECORD; 
  BEGIN
      FOR data in (SELECT * from data_registry) LOOP
	 SELECT * INTO type FROM type_labels t where t.product_type = data.product_type LIMIT 1;
	 SELECT * INTO provider FROM providers p where p.provider = data.provider LIMIT 1;
         IF ((data.type = 'range' or data.type = 'points') and data.provider <> 'gbif')  THEN
                sql = 'SELECT ' || 
                  '   TEXT(''' || provider.title || ''') as provider, ' ||
	          '   TEXT(''' || type.title || ''') as type, ' ||
		  '   TEXT(''' || provider.provider || ''') as provider_id, ' ||
	          '   TEXT(''' || type.product_type || ''') as type_id, ' ||
		  '   TEXT(''' || data.taxa || ''') as taxa, ' ||
                  '   TEXT(''' || data.table_name || ''') as data_table, ' ||
                  '   count(DISTINCT '|| data.scientificname || ') as species_count, ' ||
                  '   count(*) as feature_count FROM ' || data.table_name; 
         ELSIF data.type = 'ecoregion' or data.type = 'taxogeochecklist' THEN 		
		--ecoregion counts	
		sql = ' SELECT ' || 
		  '   TEXT(''' || provider.title || ''') as provider, ' ||
                  '   TEXT(''' || type.title || ''') as type, ' || 
		  '   TEXT(''' || provider.provider || ''') as provider_id, ' ||
	          '   TEXT(''' || type.product_type || ''') as type_id, ' ||
		  '   TEXT(''' || data.taxa || ''') as taxa, ' ||
                  '   TEXT(''' || data.table_name || ''') as data_table, ' ||
                  '   count(DISTINCT ' || data.species_id || ') as species_count, ' ||
                  '   count(*) as feature_count ' ||
                  ' FROM ' || data.table_name || ' d';
	 ELSIF data.type = 'protectedarea' or data.type = 'geochecklist' THEN 		
		--ecoregion counts	
		sql = ' SELECT ' || 
		  '   TEXT(''' || provider.title || ''') as provider, ' ||
                  '   TEXT(''' || type.title || ''') as type, ' || 
		  '   TEXT(''' || provider.provider || ''') as provider_id, ' ||
	          '   TEXT(''' || type.product_type || ''') as type_id, ' ||
		  '   TEXT(''' || data.taxa || ''') as taxa, ' ||
                  '   TEXT(''' || data.table_name || ''') as data_table, ' ||
                  '   count(DISTINCT ' || data.scientificname || ') as species_count, ' ||
                  '   count(*) as feature_count ' ||
                  ' FROM ' || data.table_name || ' d';
	  ELSE
                -- We got nuttin'
	  END IF;
	  RETURN QUERY EXECUTE sql;
       END LOOP;
    END
$$  language plpgsql;

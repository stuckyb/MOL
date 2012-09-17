-- Function to get all MOL layers (checklist and polygon), cache this result in layers_metadata
DROP function get_dashboard_metadata();
CREATE FUNCTION get_dashboard_metadata() 
	RETURNS TABLE(provider text, type text, provider_id text, type_id text, classes text,dataset_title text, species_count bigint, feature_count bigint) 
AS
$$
  DECLARE sql TEXT;
  DECLARE data RECORD; -- a data table record
  BEGIN
      FOR data in (
        SELECT * from data_registry d 
	JOIN (
		select tt.title as type_title, tt.type as type_id from types tt 
		) t 
	ON  d.type = t.type_id
	JOIN (
		select pt.title as provider_title, pt.provider as provider_id from providers pt
		) p 
	ON d.provider = p.provider_id
      )
      LOOP
	 
         IF ((data.type = 'range' or data.type = 'points') and data.provider <> 'gbif')  THEN              
		  sql = 'SELECT ' || 
                  '   TEXT(''' || REPLACE(data.provider_title, '''','''''') || ''') as provider, ' ||
	          '   TEXT(''' || REPLACE(data.type_title, '''','''''') || ''') as type, ' ||
		  '   TEXT(''' || data.provider || ''') as provider_id, ' ||
	          '   TEXT(''' || data.type || ''') as type_id, ' ||
		  '   TEXT(''' || REPLACE(data.classes, '''','''''') || ''') as classes, ' ||
                  '   TEXT(''' || REPLACE(data.dataset_title, '''','''''') || ''') as dataset_title, ' ||
                  '   count(DISTINCT '|| data.scientificname || ') as species_count, ' ||
                  '   count(*) as feature_count FROM ' || data.table_name; 
	          RETURN QUERY EXECUTE sql;
         ELSIF data.type = 'ecoregion' or data.type = 'taxogeochecklist' THEN 		
		--ecoregion counts	
		sql = ' SELECT ' || 
		  '   TEXT(''' || REPLACE(data.provider_title, '''','''''')|| ''') as provider, ' ||
                  '   TEXT(''' || REPLACE(data.type_title, '''','''''') || ''') as type, ' || 
		  '   TEXT(''' || data.provider || ''') as provider_id, ' ||
	          '   TEXT(''' || data.type || ''') as type_id, ' ||
		  '   TEXT(''' || REPLACE(data.classes, '''','''''') || ''') as classes, ' ||
                  '   TEXT(''' || REPLACE(data.dataset_title, '''','''''') || ''') as dataset_title, ' ||
                  '   count(DISTINCT ' || data.species_id || ') as species_count, ' ||
                  '   count(*) as feature_count ' ||
                  ' FROM ' || data.table_name || ' d';
	          RETURN QUERY EXECUTE sql;
	 ELSIF data.type = 'protectedarea' or data.type = 'taxogeochecklist' THEN 		
		--ecoregion counts	
		sql = ' SELECT ' || 
		  '   TEXT(''' || REPLACE(data.provider_title, '''','''''') || ''') as provider, ' ||
                  '   TEXT(''' || REPLACE(data.type_title, '''','''''') || ''') as type, ' || 
		  '   TEXT(''' || data.provider || ''') as provider_id, ' ||
	          '   TEXT(''' || data.type || ''') as type_id, ' ||
		  '   TEXT(''' || REPLACE(data.classes, '''','''''') || ''') as classes, ' ||
                  '   TEXT(''' || REPLACE(data.dataset_title, '''','''''') || ''') as dataset_title, ' ||
                  '   count(DISTINCT ' || data.scientificname || ') as species_count, ' ||
                  '   count(*) as feature_count ' ||
                  ' FROM ' || data.table_name || ' d';
		RETURN QUERY EXECUTE sql;
	  ELSE
                -- We got nuttin'
	  END IF;
	  
       END LOOP;
    END
$$  language plpgsql;

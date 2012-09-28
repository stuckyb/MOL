-- Function to create indexes on all scientific name fields
DROP function create_mol_indexes();
CREATE FUNCTION create_mol_indexes() 
	RETURNS TABLE(sql text) 
AS
$$
  DECLARE sql TEXT;
  DECLARE data RECORD;
  BEGIN
      FOR data in (SELECT * from data_registry WHERE table_name <> 'gbif_import') LOOP
	  IF data.type = 'range' THEN
          	sql = 'CREATE INDEX ' || data.table_name || '_' || data.scientificname || '_btree ON ' || data.table_name || '(' || data.scientificname || ')';
          ELSEIF data.type = 'ecoregion' or data.type = 'taxogeochecklist' THEN
	        sql = 'CREATE INDEX ' || data.table_name || '_' || data.scientificname || '_btree ON ' || data.taxo_table || ' t (' || data.scientificname || ');' ||
	              'CREATE INDEX ' || data.table_name || '_' || data.scientificname || '_btree ON ' || data.table_name || '(' || data.scientificname || ')'  ||
		      'CREATE INDEX ' || data.table_name || '_' || data.scientificname || '_btree ON ' || data.table_name || '(' || data.scientificname || ')'  ||
                      'CREATE INDEX ' || data.table_name || '_' || data.scientificname || '_btree ON ' || data.table_name || '(' || data.scientificname || ')'  ||
                      'CREATE INDEX ' || data.table_name || '_' || data.scientificname || '_btree ON ' || data.table_name || '(' || data.scientificname || ')'  ||
          ELSEIF data.type = 'ecoregion' or data.type = 'geochecklist' THEN
	  	
           
          RETURN QUERY SELECT TEXT(sql);
       END LOOP;
    END
$$  language plpgsql;

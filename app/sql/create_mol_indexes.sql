-- Function to create indexes on all scientific name fields
DROP function create_mol_indexes();
CREATE FUNCTION create_mol_indexes() 
	RETURNS TABLE(sql text) 
AS
$$
  DECLARE sql TEXT;
  DECLARE data RECORD;
  BEGIN
      FOR data in (SELECT * from data_registry WHERE type <> 'points') LOOP
          sql = 'CREATE INDEX ' || data.table_name || '_' || data.scientificname || '_btree ON ' || data.table_name || '(' || data.scientificname || ')';
          RETURN QUERY EXECUTE sql;
       END LOOP;
    END
$$  language plpgsql;

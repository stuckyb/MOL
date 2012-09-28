--get_species_list(geometry, float, text)
-- Function to get a species list from a single table.
-- Params:	
--	geometry -- a WKT Geom in WebMercator
--	radius (meters)
--	table
--	format (csv or json)

DROP function get_species_list(text, float, text, text);
CREATE FUNCTION get_species_list(text, float, text, text)
	RETURNS TABLE(scientificname text,
                      english text, 
                      "order" text, 
                      family text, 
                      redlist text, 
                      className text,
                      type_title text, 
                      provider_title text, 
                      type text,
                      provider text,
                      year_assessed text, 
                      sequenceid text, 
                      eol_page_id text) 
AS
$$
  DECLARE sql TEXT;
  DECLARE data RECORD; -- a data table record
  DECLARE taxo RECORD; -- a taxonomy table record
  DECLARE geom RECORD; -- a geometry table record 
  BEGIN
      --assemble some sql to get the table to query
      sql = 'SELECT * from data_registry WHERE table_name = ''' || $3 || '''';
	
      FOR data in EXECUTE sql LOOP
          IF data.type = 'range' or data.type = 'points' THEN
              sql = 'SELECT DISTINCT ' ||
                  '     TEXT(p.' || data.scientificname || ') as scientificname, ' ||
                  '     TEXT(t.common_names_eng) as english, ' ||
                  '     TEXT(initcap(lower(t._order))) as order, ' ||
                  '     TEXT(initcap(lower(t.Family))) as family, ' ||
                  '     TEXT(t.red_list_status) as redlist, ' ||
                  '     TEXT(initcap(lower(t.class))) as className, ' ||
                  '     TEXT(dt.title) as type_title, ' || 
                  '     TEXT(pv.title) as provider_title, ' ||
                  '     TEXT(dt.type) as type, ' ||
                  '     TEXT(pv.provider) as provider, ' ||
                  '     TEXT(t.year_assessed) as year_assessed, ' || 
                  '     TEXT(s.sequenceid) as sequenceid, ' ||
                  '     TEXT(page_id) as eol_page_id ' || 
                  ' FROM ' || $3 || ' p  ' ||
                  ' LEFT JOIN eol e  ' ||
                  '      ON p.' || data.scientificname || ' = e.scientificname  ' ||
                  '  LEFT JOIN synonym_metadata n  ' ||
                  '      ON p.' || data.scientificname || ' = n.scientificname ' || 
                  '  LEFT JOIN taxonomy t  ' ||
                  '      ON (p.' || data.scientificname || ' = t.scientificname OR n.mol_scientificname = t.scientificname)  ' ||
                  '  LEFT JOIN sequence_metadata s  ' ||
                  '      ON t.family = s.family  ' ||
                  '  LEFT JOIN types dt ON ' ||
                  '      ''' || data.type || ''' = dt.type ' ||
                  '  LEFT JOIN providers pv ON ' ||
                  '      ''' || data.provider || ''' = pv.provider ' ||
                  '  WHERE ' ||
                  '      ST_DWithin(p.the_geom_webmercator,ST_Transform(ST_PointFromText(''' || $1 ||''',4326),3857),' || $2 || ') ' ||
                  '  ORDER BY sequenceid, scientificname asc';

      		RETURN QUERY EXECUTE sql;
       END IF;
    END LOOP;
  END
$$  language plpgsql;

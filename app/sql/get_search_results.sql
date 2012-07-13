-- Function to get search results with bounding boxes for each layer
DROP FUNCTION get_search_results_2 (text);
CREATE FUNCTION get_search_results_2 (text) 
RETURNS TABLE(extent box2d, name text, type text, source text, type_title text, source_title text, names text, _class text, feature_count bigint)
AS
$$
DECLARE
name RECORD;
sci TEXT;
eng TEXT;
term TEXT;
BEGIN
  term := CONCAT('\m',$1);
  FOR name IN SELECT n,v from ac where n~*term OR v~*term  LOOP
     sci := name.n;
     eng := name.v;
     RETURN QUERY
     SELECT ST_Extent(g.the_geom) as extent, g.scientificname, t.type, TEXT('gbif'), t.title, TEXT('GBIF'), eng, lower(g.class), count(*) from gbif_import g  LEFT JOIN types t ON g.type = t.type  group by  g.scientificname,  g.class, t.type, t.title having lower(g.scientificname) = lower(sci);
     RETURN QUERY
     SELECT ST_Extent(g.the_geom) as extent, g.scientificname, g.type, g.provider, t.title, p.title,  eng, g.class, count(*) from polygons g  LEFT JOIN types t ON g.type = t.type LEFT JOIN providers p ON g.provider = p.provider group by g.scientificname,  g.class, g.type, g.provider, t.title, p.title having g.scientificname = sci;
  END LOOP;
END;
$$ LANGUAGE PLPGSQL
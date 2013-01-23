drop function get_layer_as_kml(text,text,text,text,text);
create function get_layer_as_kml(text,text,text,text,text)
RETURNS TABLE(layer_id text,  seasonality int, kml text)
AS
$$
	BEGIN
		RETURN QUERY 
		WITH 
		usext AS -- Define a CTE to store our base variables (extent and our x,y grid count)
			(SELECT ST_SetSRID(CAST(ST_Extent(the_geom_webmercator) As geometry),3857) As the_geom_ext, 
				4 as x_gridcnt, 
				4 as y_gridcnt
			FROM get_tile($1,$2,$3,$4) As s
			),
		grid_dim AS -- Define a CTE to store our grid dimension width and height that uses usext
			(SELECT 
			(ST_XMax(the_geom_ext) - ST_XMin(the_geom_ext))/x_gridcnt As g_width,
			ST_XMin(the_geom_ext) As xmin, ST_xmax(the_geom_ext) As xmax,
			(ST_YMax(the_geom_ext) - ST_YMin(the_geom_ext))/y_gridcnt As g_height,
			ST_YMin(the_geom_ext) As ymin, ST_YMax(the_geom_ext) As ymax
			FROM usext),
		grid As -- Define CTE to store our grid that uses usext and grid_dim
			(SELECT x.x, y.y, ST_SetSRID(ST_MakeBox2d(ST_Point(xmin + (x.x - 1)*g_width, ymin + (y.y-1)*g_height),
			ST_Point(xmin + x.x*g_width, ymin + y.y*g_height)), 3857) As grid_geom
			FROM 
			(SELECT generate_series(1,x_gridcnt) as x FROM usext) As x CROSS JOIN
			(SELECT generate_series(1,y_gridcnt) as y FROM usext) As y CROSS JOIN 
			grid_dim
			)
		--Use grid to clip get tile 
		 
			SELECT $5 as layer_id, m.seasonality,  ST_AsKML(the_geom_webmercator) as kml 
			FROM (
				SELECT ST_Intersection(s.the_geom_webmercator, grid_geom) As the_geom_webmercator, s.seasonality as seasonality   
				FROM get_tile($1,$2,$3,$4) As s 
				INNER JOIN grid ON ST_Intersects(s.the_geom_webmercator, grid.grid_geom)) m;
	END
$$ language plpgsql;


env = mol(function(env){return env});
bus = env.bus.Bus()
proxy = new env.services.Proxy(bus)
me = new env.map.MapEngine(proxy, bus)
me.start('body');
se = new env.map.search.SearchEngine(proxy, bus)
se.start(null)
te = new env.map.tiles.TileEngine(proxy, bus, me.display.map)
te.start()
le = new env.map.layers.LayerEngine(proxy, bus)
le.start()
re = new env.map.results.ResultsEngine(proxy, bus)
re.start()

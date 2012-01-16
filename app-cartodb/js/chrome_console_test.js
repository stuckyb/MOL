env = mol(function(env){return env});
bus = env.bus.Bus()
proxy = new env.services.Proxy(bus)
me = new env.map.MapEngine(proxy, bus)
me.start('body');
slot = '.FIRST'
position = 3
display = $('<div>"hi"</div>');
config = {display: display, slot: slot, position: position}
event = new env.bus.Event('add-map-control', config)
bus.fireEvent(event)

se = new env.map.controls.SearchEngine(proxy, bus)
se.start(null)
event = new env.bus.Event('search-display-toggle', {visible:true})
bus.fireEvent(event)

proxy = new env.services.Proxy(bus)
action = new env.services.Action('cartodb-sql-query', {sql:'select count(*) from eafr'})
callback = new env.services.Callback(function(action, response){console.log(action.type + ': ' + JSON.stringify(response))}, function(action, response){console.log(action.type + ': ' + response)})
proxy.execute(action, callback)

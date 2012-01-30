#!/bin/sh

cd js

rm -rf ../static/js/mol.js

cat mol.js mol.bus.js mol.core.js mol.map.js mol.map.layers.js mol.map.menu.js mol.map.results.js mol.map.search.js mol.map.tiles.js mol.mvp.js mol.services.cartodb.js mol.services.js > ../static/js/mol.js

cd ..

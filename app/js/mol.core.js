/**
 * This module provides core functions. 
 */
mol.modules.core = function(mol) { 
    
    mol.core = {};


    //'layer-{0}-{1}'.format(name.replace(/ /g,"_"), type.replace(/ /g,"_")));

    /**
     * Retunrs a layer id string given a layer {name, type, source}.
     */
    mol.core.getLayerId = function(layer) {
        var name = layer.name.trim().replace(/ /g, "_"),
            type = layer.type.trim().replace(/ /g, "_"),
            source = layer.source.trim().replace(/ /g, "_");
        
        return 'layer-{0}-{1}-{2}'.format(name, type, source);
    };
    
    /**
     * @param id The layer id of the form "layer-{name}-{type}-{source}".
     */
    mol.core.getLayerFromId = function(id) {
        var tokens = id.split('-'),
            name = tokens[1].replace(/_/g, " "),
            type = tokens[2].replace(/_/g, " "),
            source = tokens[3].replace(/_/g, " ");
        
        return {
            id: id,
            name: name,
            type: type,
            souce: source
        };
    };
};

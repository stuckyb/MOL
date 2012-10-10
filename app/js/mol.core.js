/**
 * This module provides core functions.
 */
mol.modules.core = function(mol) {

    mol.core = {};

    /**
     * Retunrs a layer id string given a layer {name, type, source, englishname}.
     */
    mol.core.getLayerId = function(layer) {
        var name = $.trim(layer.name.toLowerCase()).replace(/ /g, "_"),
            type = $.trim(layer.type.toLowerCase()).replace(/ /g, "_"),
<<<<<<< HEAD
            source = $.trim(layer.source.toLowerCase()).replace(/,/g, "").replace(/ /g, "_");
        return 'layer--{0}--{1}--{2}'.format(name, type, source);
    };

    /**
     * @param id The layer id of the form "layer--{name}--{type}--{source}--{englishname}".
     */
    mol.core.getLayerFromId = function(id) {
        var tokens = id.split('--'),
            name = tokens[1].replace(/_/g, " "),
            type = tokens[2].replace(/_/g, " "),
            source = tokens[3].replace(/_/g, " ");
        name = name.charAt(0).toUpperCase()+name.slice(1).toLowerCase();
        source = source.toLowerCase();
        type = type.toLowerCase();

        return {
            id: id,
            name: name,
            type: type,
            source: source
        };
    };
};
=======
            source = $.trim(layer.source.toLowerCase()).replace(/,/g, "").replace(/ /g, "_"),
            data_table = $.trim(layer.data_table).replace(/,/g, "").replace(/ /g, "_");

        return 'layer--{0}--{1}--{2}--{3}'.format(name, type, source, data_table);
    };
}
>>>>>>> 6284614c67586ab6cf7a088b95c01f95d004dba1

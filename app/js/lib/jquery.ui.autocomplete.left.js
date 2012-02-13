/*
 * jQuery UI Autocomplete Accent Folding Extension
 *
 * Copyright 2010, Scott González (http://scottgonzalez.com)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * http://github.com/scottgonzalez/jquery-ui-extensions
 */
(function( $ ) {

var autocomplete = $.ui.autocomplete;

var _initSource = autocomplete.prototype._initSource;
autocomplete.prototype._initSource = function() {
    var source = this.options.source;
    if ( $.isArray(source) ) {
        this.source = function( request, response ) {
            var matcher = new RegExp( '\\b'+autocomplete.escapeRegex( request.term ), "i" );
            response( $.grep( source, function( value ) {
                value = value.label || value.value || value;
                return matcher.test( value );
            }) );
        };
    } else {
        return _initSource.call( this );
    }
};

})( jQuery );
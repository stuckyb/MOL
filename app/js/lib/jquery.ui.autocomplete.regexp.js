/*
 * jQuery UI Autocomplete RegExp Extension
 *
 */
(function( $ ) {

var autocomplete = $.ui.autocomplete;

var _initSource = autocomplete.prototype._initSource;
autocomplete.prototype._initSource = function() {
    var source = this.options.source;
    if ( $.isArray(source) ) {
        this.source = function( request, response ) {
            var leftRegExp = this.options.leftRegExp == undefined ? '' : this.options.leftRegExp;
            var rightRegExp = this.options.rightRegExp == undefined ? '' : this.options.rightRegExp;
            var matcher = new RegExp( leftRegExp + autocomplete.escapeRegex( request.term ) + rightRegExp, "i" );
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
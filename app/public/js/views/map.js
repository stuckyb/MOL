/*
 * Map view
 */

define([
  // dependencies
  'jQuery',
  'Underscore',
  'Backbone',
  'text!/templates/map.html',
  'libs/google/maps/load',
], function ($, _, Backbone, template, loadMaps) {
  return Backbone.View.extend({

    el: '#map',
    map: null,

    initialize: function (options) {
      this.template = _.template(template);
      Views.DetailView.prototype.initialize.call(this, options);
      // Load google maps and create an instance.
      loadMaps({
        key: 'AIzaSyDJdVhfQhecwp0ngAGzN9zwqak8FaEkSTA',
        geometry: false,
      }).done(_.bind(function () {
        this.model.set({ map: {
          zoom: 8,
          center: new google.maps.LatLng(37.3689, -122.0353),
          mapTypeId: google.maps.MapTypeId.ROADMAP
        }}, { silent: true });
      }, this));
    },

    // (Overide)
    render: function () {
      var self = this;
      var model = this.parentView.model;

      if (!this.map) {
        this.$el.html(this.template());
        if (!window.google || !window.google.maps) return this;

        // Draw the map
        this.map = new google.maps.Map($('#canvas', this.el).get(0),
                                      this.model.get('map'));
      }
      
      return this;
    },

    resize: function() {
      if (window.google && window.google.maps)
        google.maps.event.trigger(this.map, 'resize');
      Views.DetailView.prototype.resize.call(this);
    },

  });
});

define(['libs/backbone/backbone.min'], function () {
  // remove library namespaces from global
  _.noConflict();
  $.noConflict();
  balanced.noConflict();
  return Backbone.noConflict();
});
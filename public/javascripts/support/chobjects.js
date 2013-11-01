define(['backbone', 'underscore'], function(Backbone, _) {
  var ChimeraObject = function(options) {
    this.options = options;
    this.initialize(options);
  };
  
  ChimeraObject.prototype.initialize = function(){};
  ChimeraObject.extend = Backbone.View.extend;
  
  _.extend(ChimeraObject.prototype, Backbone.Events);
  
  return ChimeraObject;
});

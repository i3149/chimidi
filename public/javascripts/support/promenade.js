/*! promenade v0.0.9 13-09-2013 */

define('promenade/object',['backbone', 'underscore'],
       function(Backbone, _) {
  'use strict';
  // Promenade.Object
  // ----------------

  // A ``Promenade.Object`` is a primitive class that is used by Promenade
  // types that do not inherit directly from a corresponding Backbone class.
  // It provides similar initialization behavior to that expected from the
  // base Backbone classes that most of Promenade inherit from. An options
  // argument provided to the ``Object`` constructor is passed on to an
  // ``initialize`` method, where a descendant class should put most of its
  // own contructor behavior.
  var PromenadeObject = function(options) {
    this.options = options || {};
    this.initialize(options);
  };

  // ``Promenade.Object`` re-purposes Backbone's ``extend`` static method to
  // mirror Backbone's inheritance semantics.
  PromenadeObject.extend = Backbone.View.extend;

  PromenadeObject.prototype.initialize = function(){};

  // All ``Promenade.Object`` instances have ``Backbone.Events`` mixed in to
  // their prototypes, and thus support Backbone's events API.
  _.extend(PromenadeObject.prototype, Backbone.Events);

  return PromenadeObject;
});

define('promenade/region',['promenade/object', 'promenade/view', 'underscore'],
       function(PromenadeObject, View, _) {
  'use strict';
  // Promenade.Region
  // ----------------

  // A ``Promenade.Region`` represents a sub-selection of the DOM hierarchy that
  // represents a single view. A ``Region`` is used to insert one ``View`` into
  // another ``View`` at a specific place in the first ``View`` instance's DOM.
  // ``Region`` inherits from ``Promenade.Object``, and thus is compatible with
  // the ``Backbone.Events`` API.
  var Region = PromenadeObject.extend({

    // A ``Region`` expects a ``superview`` and ``selector`` to be provided in
    // its options hash. The ``superview`` is a reference to the ``View``
    // instance that the ``Region`` belongs to, and ``selector`` is a jQuery
    // selector string that corresponds to the subset of the DOM of the
    // ``superview`` which should correspond to the ``Region`` instance.
    initialize: function(options) {
      this.superview = options.superview;
      this.selector = options.selector;
      this.subviews = [];

      this._resetContainer();

      // The region listens to the before:render and render events of the
      // ``superview`` in order to determine when it is appropriate to detach
      // and reattach any ``subviews`` that it contains.
      this.listenTo(this.superview, 'before:render', this._detachSubviews);
      this.listenTo(this.superview, 'render', this._attachSubviews);
    },

    // It is sometimes useful to be able to quickly reset the jQuery selection
    // of the ``superview`` that corresponds to the ``Region`` instance.
    _resetContainer: function() {
      if (this.selector) {
        this.$container = this.superview.$(this.selector);
      } else {
        this.$container = this.superview.$el;
      }
    },

    // The ``add`` method allows one to add an arbitrary number of additional
    // subviews to the ``Region`` instance. New ``views`` can be in the form of
    // a single instance, or an ``Array`` of instances, and will be appended to
    // the ``Region`` instance in order.
    add: function(views) {
      var PromenadeView = require('promenade/view');

      if (!views) {
        return;
      }

      if (!_.isArray(views)) {
        views = [views];
      }

      _.each(views, function(view) {
        if (view instanceof PromenadeView) {
          view.attachTo(this.$container);
        } else {
          this.$container.append(view.el);
        }

        this.listenTo(view, 'navigate', this._onSubviewNavigate);
      }, this);

      this.subviews = this.subviews.concat(views);
    },

    // The ``remove`` method allows one to remove an arbitrary subset of
    // subviews from the ``Region``. If ``views`` can be detached in a way that
    // does not unset event bindings, it will be.
    remove: function(views) {
      var PromenadeView = require('promenade/view');

      if (!views) {
        return;
      }

      if (!_.isArray(views)) {
        views = [views];
      }

      _.each(views, function(view) {
        view.remove();

        this.stopListening(view, 'navigate', this._onSubviewNavigate);
      }, this);

      this.subviews = _.difference(this.subviews, views);
    },

    detach: function(views) {
      var PromenadeView = require('promenade/view');

      if (!views) {
        return;
      }

      if (!_.isArray(views)) {
        views = [views];
      }

      _.each(views, function(view) {
        if (view instanceof PromenadeView) {
          view.detach();
        } else {
          view.$el.detach();
        }

        this.stopListening(view, 'navigate', this._onSubviewNavigate);
      }, this);

      this.subviews = _.difference(this.subviews, views);
    },

    empty: function() {
      this.remove(this.subviews);
    },

    // The ``insertAt`` method does what you might think: inserts a ``view`` at
    // an arbitrary index within the current set of ``subviews``. If the index
    // exceeds the length of the current set of ``subviews``, the ``view`` is
    // appended. If a list of ``views`` is provided, each ``view`` is inserted
    // in order starting at the provided ``index``.
    insertAt: function(views, index) {
      var PromenadeView = require('promenade/view');
      var sibling = this.subviews[index];

      if (!_.isArray(views)) {
        views = [views];
      }

      if (!sibling) {
        this.add(views);
        return;
      }

      _.each(views, function(view) {
        sibling.$el.before(view.$el);
      }, this);

      views.unshift(index, 0);

      this.subviews.splice.apply(this.subviews, views);

      //this.subviews.splice(index, 0, views);
    },

    // This is a wrapper for the most common subview insertion operation. When
    // called, the current set of ``subviews`` is removed, and the new set of
    // ``views`` provided are added.
    show: function(views) {
      var PromenadeView = require('promenade/view');

      this.remove(this.subviews);

      this.add(views);
    },

    // When called, all ``subviews`` will be rendered. If ``recursive`` is
    // truthy and the ``subviews`` support deep rendering, ``deepRender`` is
    // called instead of ``render``.
    renderSubviews: function(recursive) {
      var PromenadeView = require('promenade/view');

      _.each(this.subviews, function(view) {
        if (recursive && view instanceof PromenadeView) {
          view.deepRender();
        } else {
          view.render();
        }
      }, this);
    },

    _onSubviewNavigate: function(href, options) {
      this.superview.trigger('navigate', href, options);
    },

    // When a view is about to be rendered, it is useful to be able to
    // quickly detach the elements of its ``subviews`` which the DOM is being
    // wiped and re-rendered.
    _detachSubviews: function() {
      _.each(this.subviews, function(view) {
        view.$el.detach();
      });
    },

    // Once the ``superview`` is re-rendered, the ``$container`` needs to be
    // re-selected and the ``subviews`` need to be re-appended.
    _attachSubviews: function() {
      this._resetContainer();

      _.each(this.subviews, function(view) {
        this.$container.append(view.$el);
      }, this);
    }
  });

  return Region;
});

define('promenade/collection/retainer',['backbone', 'underscore'],
       function(Backbone, _) {
  'use strict';
  // Promenade.Collection.Retainer API
  // --------------------------------

  var RetainerApi = {

    _verifySubsetApi: function(collection) {
      return collection && _.isFunction(collection.connect) && collection.cid;
    },

    retains: function(collection) {
      var connection;

      if (!this._verifySubsetApi(collection)) {
        return collection;
      }

      this._connections = this._connections || {};

      if (this._connections[collection.cid]) {
        return collection;
      }

      connection = collection.connect();

      this._connections[collection.cid] = connection;

      return collection;
    },

    releaseConnections: function() {
      for (var id in this._connections) {
        this._connections[id].release();
        delete this._connections[id];
      }
    }
  };

  return RetainerApi;
});

define('promenade/event',['backbone', 'underscore'],
       function(Backbone, _) {
  'use strict';
  // Promenade.Event API
  // -------------------

  var EventApi = {

    delegateEventMaps: function() {
      this._ensureEventMaps();
      this.undelegateEventMaps();
      this._toggleEventMaps(true);
    },

    undelegateEventMaps: function() {
      if (!this._eventMapsDelegated) {
        return;
      }

      this._toggleEventMaps(false);
    },

    getSelf: function() {
      return this;
    },

    // If a ``selfEvents`` map is defined, handlers will be bound that respond
    // to events dispatched by the ``View`` instance. This is useful in cases
    // where, for instance, something needs to be done before or after a
    // ``View`` is rendered.
    delegateSelfEvents: function() {
      this._toggleEventMapsForTarget(['_selfEvents', 'selfEvents'], this, 'listenTo');
    },

    undelegateSelfEvents: function() {
      this._toggleEventMapsForTarget(['_selfEvents', 'selfEvents'], this, 'stopListening');
    },

    _toggleEventMaps: function(enabled) {
      var types = this._getSupportedEventMaps();
      var original;
      var key;
      var target;
      var maps;

      for (key in types) {
        original = key;
        key = key[0].toUpperCase() + key.slice(1);

        target = 'get' + key;
        target = _.result(this, target);

        key = original;

        if (!target) {
          target = key;
          target = _.result(this, target);
        }

        maps = ['_' + key + 'Events', key + 'Events'];

        this._setEventMapsForTarget(
            maps, target, enabled ? 'listenTo' : 'stopListening');
      }

      this._eventMapsDelegated = enabled;
    },

    _setEventMapsForTarget: function(maps, target, operation) {
      var eventName;
      var index;
      var map;
      var handler;
      var _index;

      if (!maps || !target || !operation) {
        return;
      }

      for (index = 0; index < maps.length; ++index) {
        if (!(maps[index] in this)) {
          continue;
        }

        map = _.result(this, maps[index]);

        for (eventName in map) {
          handler = map[eventName];

          if (_.isArray(handler)) {
            for (_index = 0; _index < handler.length; ++_index) {
              this[operation](target, eventName, this[handler[_index]]);
            }
          } else if (_.isString(handler)) {
            this[operation](target, eventName, this[handler]);
          }
        }
      }
    },

    _getSupportedEventMaps: function() {
      var supportedList;
      var supportedMap;
      var index;

      if (this._supportedEventMaps) {
        return this._supportedEventMaps;
      }

      supportedList = _.result(this, 'supportedEventMaps') || [];
      supportedMap = {};

      for (index = 0; index < supportedList.length; ++index) {
        supportedMap[supportedList[index]] = true;
      }

      this._supportedEventMaps = supportedMap;

      return supportedMap;
    },

    _ensureEventMaps: function() {
      var events = _.result(this, 'events');
      var supportedMaps;
      var event;
      var tokens;
      var handler;
      var key;

      if (!events || this._eventMapsCreated) {
        return;
      }

      this._eventMapsCreated = true;
      this.events = {};

      supportedMaps = this._getSupportedEventMaps();

      for (event in events) {
        tokens = this._tokenizeEventString(event, supportedMaps);

        if (!tokens) {
          continue;
        }

        handler = events[event];
        key = tokens[0];
        event = tokens[1];

        this[key] = _.result(this, key) || {};
        this[key][event] = handler;
      }
    },

    _tokenizeEventString: function(event, supportedEventMaps) {
      var tokens = event.match(this._splitEventString);

      if (!(tokens && tokens.length)) {
        return;
      }

      supportedEventMaps = supportedEventMaps || {};
      tokens = tokens.slice(1, 3);

      if (tokens[0] in supportedEventMaps) {
        tokens[0] = tokens[0] + 'Events';
        return tokens;
      }

      tokens[1] = tokens.join(' ').replace(this._trim, '');
      tokens[0] = 'events';

      return tokens;
    },

    _splitEventString: /^\s*([\w^]*)\s*(.*)$/i,

    _trim: /^([\s]*)|([\s]*)$/gi
  };

  return EventApi;
});

define('promenade/model',['backbone', 'require', 'promenade/collection/retainer', 'promenade/event'],
       function(Backbone, require, RetainerApi, EventApi) {
  'use strict';
  // Promenade.Model
  // ---------------

  // A ``Promenade.Model`` is the same as a ``Backbone.Model``, with some added
  // properties that formalize how nested data structures are composed.
  var Model = Backbone.Model.extend({

    // If a ``structure`` property is declared, it should be a mapping of
    // ``type`` attribute names to class references, or to ``String`` values
    // that can be used to resolve a class reference via an AMD API.
    structure: {},

    // If a ``structureEvents`` map is available, events will be bound and
    // unbound automatically based on the supplied definition. For example:
    //
    //   // ...
    //   structure: {
    //     comments: Backbone.Collection
    //   },
    //   structureEvents: {
    //     'add comments': 'onCommentAdded'
    //   },
    //   // ...
    //
    // This will automatically bind a handler to the ``'add'`` event of the
    // ``comments`` sub-collection. When the sub-collection is removed or the
    // reference is changed, the handler will be automatically updated or
    // removed as appropriate.
    structureEvents: {},

    // When defined for a ``Model`` that is associated with an
    // ``Application``, the ``type`` is used as part of the property name that
    // the ``Model`` instance is assigned to on the ``Application``
    // instance. E.g., a ``Model`` with ``type`` that resolves to ``'foo'``
    // will be assigned to the ``'fooModel'`` property on the
    // ``Application``.
    type: function() {
      var defaults = _.result(this, 'defaults');
      var namespace = _.result(this, 'namespace');
      return (this.attributes && this.get('type')) ||
             (defaults && defaults.type) || namespace || '';
    },

    // An optional ``namespace`` can be declared. By default it is an empty
    // string and ignored as a falsey value. When a collection parses server
    // data, the ``namespace`` of a ``Model`` will be used to discover the
    // data in the server response that corresponds to the ``Model``
    // parsing it.
    namespace: '',

    supportedEventMaps: ['self', 'app'],

    propagates: {},

    initialize: function(attrs, options) {
      Backbone.Model.prototype.initialize.apply(this, arguments);

      options = options || {};

      // On initialize, the ``Model`` creates a class property that refers to an
      // app instance, if provided in the options. This behavior is used to
      // support reference passing of a top-level ``Application`` down a deeply
      // nested chain of ``Collection`` and ``Model`` instances.
      this.app = options.app;

      this._needsSync = options.needsSync !== false;
      this._syncingStack = 0;

      this.delegateEventMaps();

      this._resetSyncState();
      this._resetUpdateState();
    },

    dispose: function() {
      this.undelegateEventMaps();
      this.releaseConnections();
    },

    isSparse: function() {
      var type = _.result(this, 'type');

      for (var attr in this.attributes) {
        if (attr !== 'id' && attr !== 'type') {
          return false;
        }
      }

      if (this.attributes.type && this.attributes.type !== type) {
        return false;
      }

      return typeof this.attributes.id !== undefined;
    },

    isSyncing: function() {
      return this._syncingStack > 0;
    },

    canSync: function() {
      return !!((this.collection && this.collection.url) || _.isString(this.url) || this.urlRoot);
    },

    hasSynced: function() {
      return !this._needsSync || this._synced;
    },

    needsSync: function() {
      return this.canSync() && !this.hasSynced() && !this.isSyncing();
    },

    syncs: function() {
      return this._syncs;
    },

    hasUpdated: function() {
      return this._updated;
    },

    updates: function() {
      return this._updates;
    },

    /*url: function() {
      var collection = _.result(this, 'collection');
      var namespace = (collection && _.result(collection, 'namespace')) ||
          _.result(this, 'namespace');
      var base;

      if (!namespace) {
        return Backbone.model.prototype.url.apply(this, arguments);
      }

      // Adapted from Backbone's default implementation:
      base = _.result(this, 'urlRoot') || (function() {
        throw new Error('A "urlRoot" property or function must be specified');
      })();

      base += (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(namespace);

      if (this.isNew()) {
        return base;
      }

      return base + '/' + encodeURIComponent(this.id);
    },*/

    // The default behavior of parse is extended to support the added
    // ``namespace`` property. If a namespace is defined, server data is
    // expected to nest the intended data for a client ``Model`` in
    // a property that matches the defined ``namespace``.
    parse: function(data) {
      var namespace = _.result(this, 'namespace');

      if (namespace) {
        if (!(namespace in data)) {
          throw new Error('Response data namespaced to "' +
                          namespace + '" does not exist.');
        }

        data = data[namespace];
      }

      return data;
    },

    // Sync is overridden at the ``Model`` and ``Collection`` level in order to
    // support a new ``'before:sync'`` event. This event is triggered on both
    // a ``Model`` or ``Collection`` and their associated ``Application`` (if
    // available. This event allows an ``Application`` to propagate extra
    // response data before the normal ``'sync'`` event triggers, and prior to
    // any network success callbacks being called.
    sync: function(method, model, options) {
      var success;

      options = options || {};
      success = options.success;

      this._resetSyncState();

      options.success = function(resp) {
        var app = model.app;

        if (app) {
          app.trigger('before:sync', model, resp, options);
        }

        model.trigger('before:sync', model, resp, options);

        if (success) {
          success.apply(options, arguments);
        }

        --this._syncingStack;
        this._synced = true;

        if (app) {
          app.trigger('sync', model, resp, options);
        }
      };

      return Backbone.sync.call(this, method, model, options);
    },

    fetch: function(options) {
      ++this._syncingStack;
      this.trigger('before:fetch', this, options);
      return Backbone.Model.prototype.fetch.apply(this, arguments);
    },

    save: function(options) {
      ++this._syncingStack;
      this.trigger('before:save', this, options);
      return Backbone.Model.prototype.save.apply(this, arguments);
    },

    destroy: function(options) {
      ++this._syncingStack;
      this.trigger('before:destroy', this, options);
      return Backbone.Model.prototype.destroy.apply(this, arguments);
    },

    // The default ``set`` behavior has been significantly expanded to support
    // new relationships between ``Model``, ``Collection`` and ``Application``
    // instances.
    set: function(key, value, options) {
      var structure = _.result(this, 'structure');
      var attrs;
      var attr;
      var Type;
      var current;

      // We borrow the options parsing mechanism specific to the original
      // Backbone implementation of this method.
      if (typeof key === 'object') {
        attrs = key;
        options = value;
      } else {
        (attrs = {})[key] = value;
      }

      // On ``set``, the ``Model`` creates a class property that refers to an
      // app instance, if provided in the options. This behavior is used to
      // support reference passing of a top-level ``Application`` down a deeply
      // nested chain of ``Collection`` and ``Model`` instances.
      if (options && options.app) {
        this.app = options.app;
      }

      // Then we iterate over all attributes being set.
      for (attr in attrs) {
        value = attrs[attr];

        // If the value is determined to be an embedded reference, we map the
        // attr / value combination to value derived from a resource linked from
        // the ``Application`` reference.
        if (this._isEmbeddedReference(attr, value)) {
          value = attrs[attr] = this._bridgeReference(attr, value);
        }

        // If an attribute is in our ``structure`` map, it means we should
        // ensure that the ultimate attribute value is an instance of the class
        // associated with the declared type.
        if (attr in structure) {
          Type = structure[attr];

          // If the type value is a ``String``, then we resolve the class using
          // an AMD API.
          if (_.isString(Type)) {
            Type = require(Type);
          }

          // When we have both a class and a value, and the value is not an
          // instance of the declared type, then we either create a new instance
          // of that type or update an existing instance in place.
          if (Type && value && !(value instanceof Type)) {
            current = this.get(attr);

            if (current && current instanceof Type) {
              current.set(value);
              delete attrs[attr];
            } else {
              attrs[attr] = new Type(value);
            }
          }
        }
      }

      // Once our attributes being set have been formatted appropriately,
      // the attributes are sent through the normal Backbone ``set`` method.
      return Backbone.Model.prototype.set.call(this, attrs, options);
    },

    // The default ``get`` behavior has been expanded to automatically evaluate
    // functions embedded within the attributes of a ``Model``. This allows the
    // ``Model`` to return canonical instances of ``Models`` identified by
    // embedded references as the result of a call to ``get``.
    get: function(attr) {
      var value = Backbone.Model.prototype.get.apply(this, arguments);

      if (_.isFunction(value)) {
        value = value();
      }

      return value;
    },

    toReference: function() {
      return {
        type: _.result(this, 'type'),
        id: _.result(this, 'id')
      };
    },

    defaultSerializationDepth: 1,

    // JSON serialization has been expanded to accomodate for the new value
    // types that the ``Model`` supports. If any values resolved in the scope of
    // the expanded method have their own ``toJSON`` method, those values are
    // set to the result of that method. Additionally, a truthy value passed
    // to ``toJSON`` will result in a shallow serialization where embedded
    // references will not have their ``toJSON`` methods called (in order to
    // avoid circular reference serialization traps).
    toJSON: function(depth) {
      var data = Backbone.Model.prototype.toJSON.apply(this, arguments);
      var iterator = function(_value) {
        return (_value && _value.toJSON) ?
            _value.toJSON(depth) : _value;
      };
      var key;
      var value;

      if (!_.isNumber(depth)) {
        depth = this.defaultSerializationDepth;
      }

      if (depth === 0) {
        return this._trimReferences(data);
      }

      depth = Math.max(depth - 1, 0);

      for (key in data) {
        value = data[key];

        if (_.isArray(value)) {
          value = data[key] = _.map(value, iterator);
        }

        if (value && value.toJSON) {
          data[key] = value.toJSON(depth);
        }
      }

      return data;
    },

    _selfEvents: {
      'error': '_onSyncError'
    },

    _onSyncError: function() {
      --this._syncingStack;
    },

    // This method returns true if the ``key`` and ``value`` attributes together
    // are determined to refer to an embedded reference.
    _isEmbeddedReference: function(key, value) {
      // If no ``Application`` reference exists, there is no way to look up
      // embedded references in the first place.
      if (!this.app) {
        return false;
      }

      // For values that are ``Array`` instances, observing the first index
      // will suffice as a test.
      if (_.isArray(value)) {
        value = value[0];
      }

      if (!value) {
        return false;
      }

      // A value is considered an embedded reference if it contains an ``id``
      // and a ``type`` attribute, with no other attributes present.
      for (var attr in value) {
        if (attr !== 'id' && attr !== 'type') {
          return false;
        }
      }

      return typeof value.id !== undefined && typeof value.type === 'string';
    },

    // This method creates a bridge between an embedded reference and its
    // referred-to value. A bridge takes the form of a function that can be
    // called to look up the desired value.
    _bridgeReference: function(key, value) {
      var app = this.app;
      var collection;
      var model;

      // If the value is an ``Array``, then the embedded reference represents a
      // one-to-many relationship, and a bridge must be created for each of the
      // embedded references in the ``Array``.
      if (_.isArray(value)) {
        return _.map(value, function(_value) {
          return this._bridgeReference(key, _value);
        }, this);
      }

      // A bridge works by looking for a ``Backbone.Collection`` on the root
      // ``Application`` that corresponds to the resolved ``namespace``. If no
      // ``Collection`` is found, the bridge simply returns the original value
      // of the embedded reference as provided in the server data.
      if (app) {
        collection = app.getCollectionForType(value.type);

        if (collection && collection instanceof Backbone.Collection) {
          return collection.get(value, { fetch: false });
        }
      }

      return value;
    },

    _resetSyncState: function() {
      var eventuallySyncs = new $.Deferred();

      this._synced = this._synced === true;

      if (_.result(this, 'canSync') === false ||
          _.result(this, 'isSparse') === false) {
        eventuallySyncs.resolve(this);
      } else {
        this.once('sync', function() {
          eventuallySyncs.resolve(this);
        });
      }

      this._syncs = eventuallySyncs.promise();
    },

    _resetUpdateState: function() {
      var eventuallyUpdates = new $.Deferred();

      this._updated = this._updated === true;

      this.once('update', function() {
        eventuallyUpdates.resolve(this);
        this._resetUpdateState();
      }, this);

      this._updates = eventuallyUpdates.promise();
    },

    // The ``_pluralizeString`` method returns the plural version of a provided
    // string, or the string itself if it is deemed to already be a pluralized
    // string. Presently, the implementation of this method is not robust. It
    // will not properly pluralize ``'cactus'``, for instance.
    _pluralizeString: function(string) {
      var suffix = 's';
      var offset = 0;

      if (Model.match.PLURAL_STRING.test(string)) {
        return string;
      }

      if (Model.match.ENDS_IN_Y.test(string)) {
        suffix = 'ies';
        offset = 1;
      }

      if (Model.match.ENDS_IN_S.test(string)) {
        suffix = 'es';
      }

      return string.substr(0, string.length - offset) + suffix;
    },

    _castToReference: function(data) {
      if (_.isArray(data)) {
        return _.map(data, this._castToReference, this);
      } else if (data instanceof Model) {
        return data.toReference();
      } else if (data instanceof Backbone.Model ||
                 data instanceof Backbone.Collection) {
        return null;
      }

      return data;
    },

    _trimReferences: function(data) {
      var key;

      for (key in data) {
        data[key] = this._castToReference(data[key]);
      }

      return data;
    }
  }, {
    match: {
      PLURAL_STRING: /.+[^s]s$/,
      ENDS_IN_Y: /y$/,
      ENDS_IN_S: /s$/
    }
  });

  _.extend(Model.prototype, RetainerApi, EventApi);

  return Model;
});

define('promenade/collection/subset',['backbone', 'underscore'],
       function(Backbone, _) {
  'use strict';
  // Promenade.Collection.Subset API
  // ------------------------------

  var SubsetApi = {

    configure: function(options) {
      this._prototype = this.constructor.prototype;

      this.superset = options.superset;
      this.iterator = options.iterator;
      this.alwaysRefresh = options.alwaysRefresh === true;

      this._connection = null;
      this._connectionStack = [];
      this._connectionMap = {};

      this.cid = _.uniqueId();
    },

    connect: function() {
      var connection = this._makeConnection();

      this._connectionMap[connection.id] = connection;
      this._connectionStack.push(connection.id);

      this._connectToSuperset();

      return connection;
    },

    release: function(connection) {
      connection = connection && this._connectionMap[connection.id];

      if (!connection) {
        return;
      }

      this._connectionMap[connection.id] = null;
      this._connectionStack.pop();

      if (!this._connectionStack.length) {
        this._disconnectFromSuperset();
      }
    },

    hasRootSuperset: function() {
      return !!(this.superset && !this.superset.superset);
    },

    isConnected: function() {
      return !!this._connection;
    },

    connectionCount: function() {
      return this._connectionStack.length;
    },

    refresh: function() {
      var index = 0;
      var model;

      while (index < this.length) {
        model = this.at(index);

        if (!this.iterator(model, index)) {
          this._prototype.remove.call(this, model, {
            operateOnSubset: true
          });
          continue;
        }

        ++index;
      }

      this._prototype.add.call(this, this.superset.filter(this.iterator), {
        operateOnSubset: true
      });
    },

    _connectToSuperset: function() {
      // The ``'add'``, ``'remove'`` and ``'reset'`` events are listened to by
      // the ``subset`` on the superset ``Collection`` instance so that changes
      // to the superset are reflected automatically in the ``subset``.
      // When a ``subset`` is no longer being used, ``stopListening`` should
      // be called on it so that the automatically created listeners are cleaned
      // up.
      if (this.superset && !this.isConnected()) {
        this.listenTo(this.superset, 'add', this._onSupersetAdd);
        this.listenTo(this.superset, 'remove', this._onSupersetRemove);
        this.listenTo(this.superset, 'reset', this._onSupersetReset);
        this.listenTo(this.superset, 'change', this._onSupersetChange);
        this.listenTo(this.superset, 'sort', this._onSupersetSort);

        this.refresh();

        this._connection = true;

        if (!this.hasRootSuperset()) {
          this._connection = this.retains(this.superset);
        }
      }

      return this;
    },

    _disconnectFromSuperset: function() {
      if (this.superset && this.isConnected()) {
        this.stopListening(this.superset);

        this.reset(null, { silent: true });


        if (_.isObject(this._connection)) {
          this._connection.release();
        }

        this._connection = false;
      }

      return this;
    },

    _makeConnection: function() {
      var subset = this;
      var connection = {
        id: _.uniqueId(),
        release: function() {
          subset.release(connection);
        }
      };

      return connection;
    },

    _onSupersetAdd: function(model) {
      if (this.alwaysRefresh) {
        return this.refresh();
      }

      if (!this.iterator(model)) {
        return;
      }

      this._prototype.add.call(this, model, {
        operateOnSubset: true
      });
    },

    _onSupersetRemove: function(model) {
      if (this.alwaysRefresh) {
        return this.refresh();
      }

      this._prototype.remove.call(this, model, {
        operateOnSubset: true
      });
    },

    _onSupersetReset: function() {
      if (this.alwaysRefresh) {
        return this.refresh();
      }

      this._prototype.reset.call(this, null, {
        operateOnSubset: true
      });
    },

    _onSupersetChange: function(model) {
      if (this.alwaysRefresh) {
        return this.refresh();
      }

      if (!this.iterator(model)) {
        return this._onSupersetRemove(model);
      }

      this._prototype.add.call(this, model, {
        operateOnSubset: true
      });
    },

    _onSupersetSort: function(superset, options) {
      if (options && options.sortSubsets === false) {
        return;
      }

      this.sort(options);
    },

    set: function(models, options) {
      if (options && options.operateOnSubset) {
        return this._prototype.set.apply(this, arguments);
      }

      return this.superset.set.call(this.superset, arguments);
    }
  };

  _.each(['toJSON', 'toArray'], function(method) {
    SubsetApi[method] = function() {
      var result;

      if (this.isConnected()) {
        return this._prototype[method].apply(this, arguments);
      }

      this._connectToSuperset();

      result = this._prototype[method].apply(this, arguments);

      this._disconnectFromSuperset();

      return result;
    };
  });

  // When a ``superset`` is assigned to a ``SubsetCollection`` instance, any
  // in-place manipulation of the ``SubsetCollection`` instance is redirected to
  // the ``superset``. Changes will automatically reflect in the
  // ``SubsetCollection`` as events propagate.
  _.each(['add', 'remove', 'create', 'fetch'], function(method) {
    SubsetApi[method] = function() {
      if (this.superset && this.isConnected()) {
        return this.superset[method].apply(this.superset, arguments);
      }
    };
  });


  return SubsetApi;
});

define('promenade/collection',['backbone', 'underscore', 'require', 'promenade/model',
        'promenade/collection/retainer', 'promenade/collection/subset',
        'promenade/event'],
       function(Backbone, _, require, Model, RetainerApi, SubsetApi, EventApi) {
  'use strict';
  // Promenade.Collection
  // --------------------

  // A ``Promenade.Collection`` is the same as a ``Backbone.Collection``, with
  // some added functionality and pre-defined default behavior.
  var Collection = Backbone.Collection.extend({

    // The default model class for a Promenade ``Collection`` is the Promenade
    // ``Model``.
    model: Model,

    supportedEventMaps: Model.prototype.supportedEventMaps,

    setDefaults: {},

    propagates: {},

    // When defined for a ``Collection`` that is associated with an
    // ``Application``, the ``type`` is used as part of the property name that
    // the ``Collection`` instance is assigned to on the ``Application``
    // instance. E.g., a ``Collection`` with ``type`` that resolves to ``'foo'``
    // will be assigned to the ``'fooCollection'`` property on the
    // ``Application``. By default, a ``Collection`` defers to its designated
    // ``Model`` to resolve the value of ``type``.
    type: function() {
      return _.result(this.model.prototype, 'type') || '';
    },

    // An optional ``namespace`` can be declared. By default it is an empty
    // string and ignored as a falsey value. When a collection parses server
    // data, the ``namespace`` of a ``Collection`` will be used to discover the
    // data in the server response that corresponds to the ``Collection``
    // parsing it. By default, a ``Collection`` defers to its designated
    // ``Model`` to resolve the value of ``namespace``.
    namespace: function() {
      return _.result(this.model.prototype, 'namespace') || '';
    },

    initialize: function(models, options) {
      Backbone.Collection.prototype.initialize.apply(this, arguments);
      options = options || {};
      // On initialize, the ``Collection`` creates a class property that refers
      // to an app instance, if provided in the options. This behavior is used
      // to support reference passing of a top-level application down a deeply
      // nested chain of ``Collection`` and ``Model`` instances.
      this.app = options.app;

      this._needsSync = options.needsSync !== false;
      this._syncingStack = 0;

      this.delegateEventMaps();

      this._resetSyncState();
    },

    dispose: Model.prototype.dispose,

    isSyncing: Model.prototype.isSyncing,

    canSync: function() {
      return !!_.result(this, 'url');
    },

    hasSynced: Model.prototype.hasSynced,

    needsSync: Model.prototype.needsSync,

    hasUpdated: Model.prototype.hasUpdated,

    syncs: Model.prototype.syncs,

    updates: Model.prototype.updates,

    fetch: function(options) {
      ++this._syncingStack;
      this.trigger('before:fetch', this, options);
      return Backbone.Collection.prototype.fetch.apply(this, arguments);
    },

    create: function(options) {
      ++this._syncingStack;
      this.trigger('before:create', this, options);
      return Backbone.Collection.prototype.create.apply(this, arguments);
    },

    // Promenade's ``Collection`` extends the default behavior of the ``get``
    // method. When ``get`` is used to find a model by Number or String ``id``,
    // and the model does not already exist in the collection, the model is
    // created, added and fetched before being returned by the method.
    get: function(id, options) {
      var model;

      options = options || {
        fetch: true
      };

      if (this._performingSetOperation) {
        options.fetch = false;
      }
      // If ``get`` receives an ``Array`` of ``id`` values as the first
      // parameter, then ``Collection`` will return an ``Array`` containing the
      // result of a lookup on each of those ``id`` values.
      if (_.isArray(id)) {
        return _.map(id, function(_id) {
          return this.get(_id, options);
        }, this);
      }

      model = Backbone.Collection.prototype.get.apply(this, arguments);

      // If the model is found by Backbone's default ``get`` implementation,
      // we return the found model instance.
      if (model) {
        if (!(model instanceof Model)) {
          return model;
        }
      } else {
        if (_.isObject(id) && id instanceof Backbone.Model) {
          return;
        }

        if (this.model && id) {
          if (_.isString(id) || _.isNumber(id)) {
            model = {};
            model[this.model.prototype.idAttribute] = id;
          } else {
            model = id;
          }

          // Here we create the model via the mechanism used by
          // ``Backbone.Collection``.
          model = this._prepareModel(model, {
            needsSync: true
          });

          this.add(model);
        }
      }

      if (options.fetch && this._isCandidateForFetch(model)) {

        // We pre-emptively fetch the model from the server.
        model.fetch();
      }

      return model;
    },

    set: function(models, options) {
      var result;

      options = _.defaults(options || {}, _.extend({
        merge: true,
        remove: false
      }, _.result(this, 'setDefaults')));

      this._performingSetOperation = true;

      result = Backbone.Collection.prototype.set.call(this, models, options);

      this._performingSetOperation = false;

      return result;
    },

    // The default behavior of parse is extended to support the added
    // ``namespace`` property. If a namespace is defined, server data is
    // expected to nest the intended data for a client ``Collection`` in
    // a property that matches the defined ``namespace``.
    parse: Model.prototype.parse,

    sync: Model.prototype.sync,

    // A subset ``Collection`` instance can be created that represents the set
    // of ``models`` in the superset remaining when filtered by ``iterator``.
    // All semantics of ``_.filter`` apply when filtering a subset. The returned
    // ``Collection`` instance is an instance of ``Promenade.Collection`` by
    // default.
    subset: function(iterator, options) {
      var CollectionClass = this.constructor;
      var subset;

      options = _.extend(options || {}, {
        app: this.app,
        superset: this,
        iterator: iterator
      });

      subset = new CollectionClass(null, options);
      _.extend(subset, SubsetApi);
      subset.configure(options);

      return subset;
    },

    _isCandidateForFetch: function(model) {
      return this.url && model && model.url &&
          (!(model instanceof Model) ||
           (model.isSparse() && !model.hasSynced()));
    },

    _resetSyncState: Model.prototype._resetSyncState,

    // The internal ``_prepareModel`` method in the ``Collection`` is extended
    // to support propagation of any internal ``app`` references. This ensures
    // that ``Model`` instances created by the ``Collection`` will contain
    // matching references to a parent ``Application`` instance.
    _prepareModel: function(attrs, options) {
      var namespace;
      var namespaced;

      // Provided options, if any, are defaulted to contain a reference to this
      // ``Collection`` instance's corresponding ``app``.
      options = _.defaults(options || {}, {
        app: this.app,
        needsSync: false
      });

      namespace = _.result(this.model.prototype, 'namespace');

      // When we are preparing a ``Model`` instance with a declared
      // ``namespace``, the attributes must be nested in the ``namespace``
      // before they are parsed.
      if (options.parse && namespace) {
        namespaced = {};
        namespaced[namespace] = attrs;

        attrs = namespaced;
      }

      // With the option defaults set, the normal ``_prepareModel`` method is
      // used to finish creating the ``Model`` instance.
      return Backbone.Collection.prototype._prepareModel.call(this,
                                                              attrs, options);
    }
  });

  _.extend(Collection.prototype, RetainerApi, EventApi);

  Collection.Subset = SubsetApi;
  Collection.Retainer = RetainerApi;

  return Collection;
});

define('promenade/view',['jquery', 'backbone', 'templates', 'underscore', 'promenade/region',
        'promenade/collection/retainer', 'promenade/event', 'promenade/model',
        'promenade/collection'],
       function($, Backbone, templates, _, Region, RetainerApi, EventApi,
                Model, Collection) {
  'use strict';
  // Promenade.View
  // --------------

  // A ``Promenade.View`` extends ``Backbone.View`` with functionality that is
  // commonly re-implemented. The ``View`` is automatically able to handle
  // template rendering, data serialization and subview/parentview
  // relationships.
  var View = Backbone.View.extend({

    // Upon initialization, the ``View`` instance takes stock of optional
    // ``template`` and ``collection`` settings. If a ``template`` is defined,
    // either at the class level or overridden in the options, a template
    // is looked up on the resolved ``'templates'`` module.
    initialize: function(options) {
      Backbone.View.prototype.initialize.apply(this, arguments);

      options = options || {};

      this.collection = options.collection;
      this.template = options.template || this.template;

      if (this.template) {
        this.templateFactory = templates[this.template];
      }

      this.layout = options.layout || this.layout || {};

      this._loadingStack = 0;

      this._ensureRegions();
      this._ensureRenderQueue();
    },

    supportedEventMaps: ['model', 'collection', 'self'],

    // ``delegateEvents`` is a built-in Backbone concept that handles creating
    // event handlers for DOM events. Promenade leverages this concept to
    // support managed event binding related to other event emitters.
    delegateEvents: function() {
      Backbone.View.prototype.delegateEvents.apply(this, arguments);

      this.delegateEventMaps();

      return this;
    },

    // ``undelegateEvents`` undoes all of what ``delegateEvents`` does. It is
    // extended by the ``View`` to undo what the extended ``delegateEvents``
    // does in Promenade.
    undelegateEvents: function() {
      Backbone.View.prototype.undelegateEvents.apply(this, arguments);

      this.undelegateEventMaps();

      return this;
    },

    // The default ``render`` routine of Backbone is a no-op. In Promenade,
    // ``render`` has been formalized to support subviews and templates.
    render: function(recursive) {
      var data;
      var html;
      var region;

      // We alert any interested parties that the ``View`` is about to be
      // rendered. This allows ``Region`` instances to safely remove subviews
      // while the parent ``View`` instance is being rendered.
      this.trigger('before:render');

      // If a ``templateFactory`` is available, it is used to generate an HTML
      // structure based on model data.
      if (this.templateFactory) {
        data = this.serializeModelData();
        html = this.templateFactory(data);

        this.$el.html(html);
      }

      // If recursive rendering is desired, each region is asked to re-render
      // its subviews.
      if (recursive) {
        for (region in this.layout) {
          this.getRegion(region).renderSubviews(recursive);
        }
      }

      // When ``render`` is done, a ``'render'`` event is dispatched to notify
      // any interested parties. ``Region`` instances will respond to this event
      // by re-attaching any previously detached subviews.
      this.trigger('render');

      return this;
    },

    // Remove has been expanded to automatically call ``undelegateEvents``. This
    // behavior is implied in Backbone because of the way jQuery.remove / empty
    // works, but we need to make sure that events bound to the ``model`` and
    // the ``View`` instance itself are also unbound.
    remove: function() {
      var region;

      for (region in this.layout) {
        this[this.getRegionProperty(region)].empty();
      }

      this.trigger('remove', this);

      this._bubbleDomDetach();

      this.undelegateEvents();
      this.releaseConnections();

      Backbone.View.prototype.remove.apply(this, arguments);
      return this;
    },

    // The template can be declared on the class level.
    template: '',


    // A new ``detach`` method allows the ``View`` to be detached in a way that
    // is non-destructive for DOM event delegation.
    detach: function() {
      var region;

      if (!this.$el.parent().length) {
        return this;
      }

      this.$el.detach();

      this.trigger('detach', this);

      this._bubbleDomDetach();

      return this;
    },

    // The ``attachTo`` method allows easy re-attachment without also expecting
    // the user to subsequently call ``delegateEvents``.
    attachTo: function($parent) {
      var region;

      this.detach();

      this.$el.appendTo($parent);
      this.delegateEvents();

      this.trigger('attach', this);

      this._bubbleDomAttach();

      return this;
    },

    // ``deepRender`` is a decorator for performing a recursive call to
    // ``render``.
    deepRender: function() {
      return this.render(true);
    },

    asyncRender: function() {
      return this._queueRenderOperation(this.render);
    },

    // Model lookup has been formalized so that there are distinct rules for
    // when ``model`` is used, and when ``collection`` is used.
    hasModel: function() {
      return !!this.getModel();
    },

    getModel: function() {
      return this.model || this.getCollection();
    },

    hasCollection: function() {
      return !!this.getCollection();
    },

    getCollection: function() {
      return this.collection;
    },

    // Region lookup has been formalized to support naming convention
    // agnosticism.
    getRegion: function(region) {
      return this[this.getRegionProperty(region)];
    },

    getRegionProperty: function(region) {
      return region + 'Region';
    },

    serializationDepth: 1,

    // The ``serializeModelData`` method is intended to provide an override-able
    // method for translating a ``model`` or ``collection`` into serialized
    // data consumable by the given template, if any.
    serializeModelData: function() {
      var data;
      var model;
      var collection;

      if (!this.hasModel()) {
        data = {};
      } else {
        model = this.getModel();
        collection = this.getCollection();

        data = model.toJSON(_.result(this, 'serializationDepth'));

        if (model instanceof Backbone.Model) {
          data.model_is_new = model.isNew();

          if (model instanceof Model) {
            data.model_has_synced = model.hasSynced();
          }
        }

        if (collection instanceof Collection) {
          data.collection_has_synced = collection.hasSynced();
          data.collection_is_empty = collection.length === 0;
        }
      }

      this.trigger('serialize', data);

      return data;
    },

    getRenderQueue: function() {
      return this._renderQueue.then(_.bind(function() {
        return this._tick();
      }, this));
    },

    pushRenderQueue: function(fn) {
      this._renderQueue = this.getRenderQueue().then(_.bind(fn, this));
      return this._renderQueue;
    },

    // By default, a ``View`` will re-render on most manipulation-implying
    // events dispatched by its ``model`` or ``collection``.
    _modelEvents: {
      'change': 'render',
      'before:fetch': '_setLoading',
      'before:save': '_setLoading',
      'before:destroy': '_setLoading',
      'sync': '_setNotLoading'
    },

    _collectionEvents: {
      'before:fetch': '_setLoading',
      'before:create': '_setLoading',
      'sync': '_setNotLoading'
    },

    _selfEvents: {
      'dom:attach': '_bubbleDomAttach',
      'dom:detach': '_bubbleDomDetach'
    },

    _bubbleDomAttach: function(view) {
      for (var region in this.layout) {
        _.invoke(this.getRegion(region).subviews,
                 'trigger', 'dom:attach', view || this);
      }
    },

    _bubbleDomDetach: function(view) {
      for (var region in this.layout) {
        _.invoke(this.getRegion(region).subviews,
                 'trigger', 'dom:detach', view || this);
      }
    },

    _setLoading: function() {
      ++this._loadingStack;
      this.$el.addClass('loading');
    },

    _setNotLoading: function() {
      if (!this._loadingStack) {
        return;
      }

      if (--this._loadingStack === 0) {
        this.$el.removeClass('loading');
      }
    },

    _ensureRegions: function() {

      // Any regions of the ``View`` defined in the ``layout`` map
      // are created as ``Region`` instances associated with the ``View``
      // instance.
      for (var region in this.layout) {
        this[this.getRegionProperty(region)] = new Region({
          superview: this,
          selector: this.layout[region]
        });
      }
    },

    _ensureRenderQueue: function() {
      this._renderQueue = (new $.Deferred()).resolve().promise();
    },

    _tick: function() {
      var Result = new $.Deferred();

      if (typeof window.requestAnimationFrame !== 'undefined') {
        window.requestAnimationFrame(function() {
          Result.resolve();
        });
      } else {
        window.setTimeout(function() {
          Result.resolve();
        }, 0);
      }

      return Result.promise();
    }
  });

  _.extend(View.prototype, RetainerApi, EventApi);

  return View;
});

define('promenade/view/collection',['promenade/view', 'promenade/collection'],
       function(View, Collection) {
  'use strict';
  // Promenade.CollectionView
  // ------------------------

  // The ``CollectionView`` handles a very common use case: using a
  // ``Backbone.View`` to represent a ``Backbone.Collection`` instance. The
  // ``CollectionView`` automatically handles insertion, removal and
  // re-rendering of ``View`` instances that correspond to ``Model`` instances
  // in a provided ``Collection`` instance.
  var CollectionView = View.extend({

    // The ``itemView`` declared on a ``CollectionView`` is the ``View`` class
    // that should be used to render individual items.
    itemView: View,

    loadingView: null,

    // The default ``tagName`` for a ``CollectionView`` is changed from
    // ``'div'`` to ``'ul'``, as it is a very common case to use a list to
    // represent a collection of things in the DOM.
    tagName: 'ul',

    initialize: function() {
      // The layout always must have an ``'outlet'`` region which corresponds
      // the the place where items in the provided ``collection`` should be
      // rendered to.
      this.layout = _.defaults(this.layout || {}, {
        outlet: '',
        loading: ''
      });
      this.items = {};

      View.prototype.initialize.apply(this, arguments);

      this.retains(this.getCollection());
    },

    // Upon render, we call ``resetItems`` to make sure that every contained
    // item gets rendered as well.
    _selfEvents: _.defaults({
      'render': 'resetItems'
    }, View.prototype._selfEvents),

    // A new mapping of ``collectionEvents`` can be declared. This allows a
    // distinction between the events bound to a ``model`` instance and a
    // ``collection`` instance. This means that a ``CollectionView`` can support
    // behavior in response to both a given ``model`` and a given
    // ``collection``.
    //
    // By default the ``collectionEvents`` are set up to respond to manipulation
    // events in the given ``collection`` by adding, removing or resetting its
    // subviews.
    _collectionEvents: _.defaults({
      'add': '_addItemByModel',
      'remove': '_removeItemByModel',
      'reset': '_removeAllItems',
      'sort': '_sortItems'
    }, View.prototype._collectionEvents),

    // The semantics of looking up a given ``model`` or ``collection`` in a
    // ``CollectionView`` are slightly different. In ``Promenade.View``, a
    // ``model`` can be represented by either a ``model`` or ``collection`` (in
    // that order). In a ``CollectionView``, both a ``model`` and ``collection``
    // can be represented by the ``View`` at the same time.
    hasModel: function() {
      return !!this.model;
    },

    getModel: function() {
      return this.model;
    },

    createItemView: function(model) {
      return new this.itemView({
        model: model
      }).render();
    },

    createLoadingView: function() {
      return new this.loadingView({
        model: this.getModel(),
        collection: this.getCollection()
      }).render();
    },

    hasLoadingView: function() {
      return !!this.loadingView;
    },

    _setLoading: function() {
      var firstLoad = !this._loadingStack;

      View.prototype._setLoading.apply(this, arguments);

      if (firstLoad && this.hasLoadingView()) {
        this.getRegion('loading').show(this.createLoadingView());
      }
    },

    _setNotLoading: function() {
      View.prototype._setNotLoading.apply(this, arguments);

      if (!this._loadingStack) {
        this.getRegion('loading').empty();
      }
    },

    // When a ``CollectionView`` needs to remove all items and re-add them
    // one at a time, this method can be called.
    resetItems: function() {
      this._removeAllItems();

      if (!this.hasCollection()) {
        return;
      }

      this.getCollection().each(function(model) {
        this._addItemByModel(model);
      }, this);
    },

    render: function() {
      View.prototype.render.apply(this, arguments);

      if (this.hasCollection() && this.getCollection().length === 0) {
        this.outletRegion.$container.addClass('empty');
      }

      return this;
    },

    // Subviews in a ``CollectionView`` are tracked by the ``cid`` of the models
    // that represent them. This allows us to look up a ``View`` instance by
    // a model instance.
    _containsItem: function(model) {
      return this.items[model.cid] !== null &&
             this.items[model.cid] !== undefined;
    },

    // The main mechanism for adding a subview to a ``CollectionView`` is by
    // a ``model`` reference. This ``model`` should be contained by the
    // ``collection`` that is associated with the ``CollectionView``.
    _addItemByModel: function(model) {
      var region;
      var index;
      var view;

      this.outletRegion.$container.removeClass('empty');

      // If we already have this ``model`` as a subview, we do nothing.
      if (this._containsItem(model)) {
        return;
      }

      // We look-up the ``'outlet'`` region, get the index of the model being
      // added, create a ``View`` instance, render it and insert the ``View``
      // instance into our ``'outlet'`` region.
      region = this.getRegion('outlet');
      index = this.getCollection().indexOf(model);
      view = this.createItemView(model);

      this.items[model.cid] = view;

      region.insertAt(view, index);
    },

    // Subviews are removed in a similar way to how they are added. A received
    // ``model`` instance is used to lookup a ``View`` instance previously
    // attached to the ``CollectionView``. If one exists, it is removed from
    // the ``'outlet'`` region and disposed of.
    _removeItemByModel: function(model) {
      var view = this.items[model.cid];
      var region = this.getRegion('outlet');

      if (!view) {
        return;
      }

      delete this.items[model.cid];

      region.remove(view);
      view.undelegateEvents();
    },

    // Sometimes we want to remove all subviews at once. For instance, when our
    // provided ``collection`` triggers a ``'reset'`` event, all models in that
    // ``collection`` are flushed. The ``collection`` will dispatch separate
    // ``'add'`` events if the ``'reset'`` was triggered by some kind of network
    // sync, so we don't need to re-add subviews in this case.
    _removeAllItems: function() {
      var region = this.getRegion('outlet');

      _.each(this.items, function(view) {
        region.remove(view);
        view.undelegateEvents();
      }, this);

      this.items = {};
    },

    _sortItems: function() {
      var region = this.getRegion('outlet');

      _.each(this.items, function(view) {
        region.detach(view);
      }, this);

      this.getCollection().each(function(model) {
        region.add(this.items[model.cid]);
      }, this);
    }
  });

  return CollectionView;
});

define('promenade/view/form',['promenade/view'],
       function(View) {
  'use strict';

  // Promenade.FormView
  // ------------------------

  var FormView = View.extend({

    events: function() {
      return {
        'submit':'triggerSubmit',
        'click input[type=submit]':'triggerSubmit'
      };
    },

    triggerSubmit: function(event){
      this.trigger('submit');
      return false;
    },

    reset: function(){
      this.$('form')[0].reset();
    }

  });

  return FormView;
});

define('promenade/controller',['backbone', 'underscore', 'promenade/object'],
       function(Backbone, _, PromenadeObject) {
  'use strict';
  // Promenade.Controller
  // --------------------


  // Promenade.Controller is a contruct that is used to handle responses to
  // navigation events in the application. It extends ``Promenade.Object``, and
  // as such supports the ``Backbone.Events`` API.
  var Controller = PromenadeObject.extend({

    // When instantiated, the only option a ``Controller`` expects is ``app``,
    // which is a reference to the parent ``Application`` instance.
    initialize: function(options) {

      this.app = options && options.app;

      // Routes are defined immediately.
      this.routes = {};
      this.defineRoutes.call(this._getDefinitionContext());

      // A ``_routeMatchers`` list is created to support observing state change
      // events based on navigation behavior.
      this._routeMatchers = _.map(this.routes, function(handler, route) {
        return this.app._routeToRegExp(route);
      }, this);

      this._state = Controller.state.INACTIVE;
    },

    isActive: function() {
      return this._state === Controller.state.ACTIVE;
    },

    // When the state changes to ``active``, this method is called.
    activate: function() {},

    // Similarly, when the state changes to ``inactive``, this method is called.
    deactivate: function() {},

    // ``_activate`` and ``_deactivate`` exist the handle kicking off state
    // transition whenever the state changes between ``active`` and
    // ``inactive``. In addition to calling the built-in ``activate`` and
    // ``deactivate`` handlers, they dispatch an ``activate`` and ``deactivate``
    // event.
    setActive: function() {
      if (this._state === Controller.state.INACTIVE) {
        this._state = Controller.state.ACTIVE;
        this.activate();
        this.trigger('activate');
      }
    },

    setInactive: function() {
      if (this._state === Controller.state.ACTIVE) {
        this._state = Controller.state.INACTIVE;
        this.deactivate();
        this.trigger('deactivate');
      }
    },

    // Navigation events are observed to determine when it is appropriate to
    // transition the state of the ``Controller``.
    handlesRoute: function(route) {
      for (var index = 0; index < this._routeMatchers.length; ++index) {
        if (this._routeMatchers[index].test(route)) {
          return true;
        }
      }

      return false;
    },

    // This method defaults to a no-op. Override it to define the routes that
    // your inherited Controller can handle. Example:
    //
    //   // ...
    //   defineRoutes: function() {
    //     this.handle('foo', 'fooHandler');
    //     this.show('bar', 'barHandler');
    //     this.handle('baz', function() {
    //       this.show('vim', 'bazVimHandler');
    //     });
    //   }
    //   // ...
    //
    // Will define the following routes:
    //
    //   {
    //     'foo': 'fooHandler',
    //     'bar': 'barHandler',
    //     'baz/vim/:param1': 'bazVimHandler'
    //   }
    //
    // These routes will be consumed by the Application when the Controller is
    // instantiated.
    defineRoutes: function() {},


    // This method is an internal mechanism to generate ``route`` event handlers
    // which will later be consumed by the ``Application`` instance.
    //_handle: function(fragment, handler, options, subdefine, generators) {
    _handle: function(state) {
      var handler = state.handler;
      var fragment = state.fragment;
      var options = state.options;
      var subdefine = state.subdefine;
      var generators = state.generators;

      if (handler) {
        this.routes[fragment] = _.bind(function() {
          var args = Array.prototype.slice.call(arguments);
          var params;
          // All arguments to the ``route`` handler (typically in the form of
          // ``String`` values) are mapped to resources by using 'generator'
          // functions defined by the definition context.
          params = _.map(generators, function(generator) {
            if (generator.consumesArgument) {
              return generator(args.shift());
            }

            return generator();
          }).concat(args);

          this.setActive();

          $.when.apply($, params).then(_.bind(function() {
            if (this.isActive()) {
              this[handler].apply(this, arguments);
            }
          }, this));
        }, this);
      }

      // When the route is 'compound', we callback with a modified definition
      // context to enable additional route definitions.
      if (subdefine) {
        subdefine.call(this._getDefinitionContext(fragment, generators));
      }
    },

    // The definition context exposes an interface that allows the user to
    // define what the current fragment of a route means without having to
    // implement specific behavior to retrieve meaningful resources from the
    // application of said route.
    _createDefinitionContext: function(root, generators) {

      generators = generators || [];

      return {
        // A ``handle`` definition refers to a fragment that can be handled, but
        // which is not expected to include a parameter.
        handle: this._createDefinitionStateParser(function(state) {
          state.generators = generators.slice();
          state.fragment = root + state.fragment;
          this._handle(state);
        }),
        // A ``show`` definition refers to a fragment that should be
        // expected to include a subsequent parameter.
        show: this._createDefinitionStateParser(function(state) {
          var _generators = generators.slice();
          var fragment = state.fragment;
          var options = state.options;
          var type = options && options.type;
          var generator;
          // Resource generators are created when a ``show`` definition
          // is made. During such a definition, the fragment can be expected to
          // refer to the ``type`` of the resource expected.
          generator = _.bind(function(id) {
            var model = this.app.getResource(type || fragment);

            if (model instanceof Backbone.Model ||
                model instanceof Backbone.Collection) {
              model = model.get(id);

              if (_.result(model, 'isSparse') === true &&
                  _.result(model, 'isSyncing') === true) {
                model = _.result(model, 'syncs') || model;
              }

              return  model;
            }

            return id;
          }, this);
          generator.consumesArgument = true;
          _generators.push(generator);
          state.generators = _generators;
          state.fragment = this._formatRoot(root + fragment) + ':' +
              (type || fragment);
          this._handle(state);
        }),
        index: this._createDefinitionStateParser(function(state) {
          var _generators = generators.slice();
          var fragment = state.fragment;
          var options = state.options;
          var type = options && options.type;

          _generators.push(_.bind(function() {
            var model = this.app.getResource(type || fragment);

            if (model instanceof Backbone.Model ||
                model instanceof Backbone.Collection) {

              if (_.result(model, 'isSparse') !== false &&
                  _.result(model, 'needsSync') !== false) {
                model.fetch();
              }

              model = _.result(model, 'syncs') || model;
            }

            return model;
          }, this));
          state.generators = _generators;
          state.fragment = root + fragment;
          this._handle(state);
        }),
        // An ``any`` definition behaves like a splat, and thus cannot support
        // subsequent definitions.
        any: this._createDefinitionStateParser(function(state) {
          state.generators = generators.slice();
          state.handler = state.fragment;
          state.fragment = root + '*any';
          this._handle(state);
        })
      };
    },

    // The interface for defining a route hierarchy is a simple abstraction of
    // non-trivial behavior. This method parses the arguments for each route
    // definition and converts them to a state object for further processing.
    _createDefinitionStateParser: function(fn) {
      return _.bind(function(fragment, handler, options, subdefine) {
        var state = {};
        state.fragment = fragment;

        if (_.isString(handler)) {
          state.handler = handler;
          if (_.isFunction(options)) {
            state.subdefine = options;
          } else {
            state.options = options;
            state.subdefine = subdefine;
          }
        }

        if (_.isFunction(handler)) {
          state.subdefine = handler;
        } else if (_.isObject(handler)) {
          state.options = handler;
          if (_.isFunction(options)) {
            state.subdefine = options;
          }
        }

        fn.call(this, state);
      }, this);
    },

    // If a fragment is an empty string, it should not have a slash. Backbone
    // expects that fragments have no root path. In all other cases, a trailing
    // slash must be added to the fragment for the sake of any subsequently
    // appended parts.
    _formatRoot: function(fragment) {
      return fragment ? fragment + '/' : '';
    },

    _getDefinitionContext: function(fragment, generators) {
      return this._createDefinitionContext(this._formatRoot(fragment),
                                           generators);
    }
  }, {
    state: {
      ACTIVE: 'active',
      INACTIVE: 'inactive'
    }
  });

  return Controller;
});

define('promenade/application',['backbone', 'underscore', 'jquery', 'require'],
       function(Backbone, _, $, require) {
  'use strict';
  // Promenade.Application
  // --------------------

  // An Application is the central entry point for a Promenade app.
  // It inherits from Backbone.Router.
  var Application = Backbone.Router.extend({

    // The ``root`` property on ``Application`` is a string selector that
    // refers to the root element that the ``Application`` should use for
    // any insertion of new DOM elements. When defined, a ``rootElement`` and
    // ``$rootElement`` property will be present on an ``Application`` instance
    // that refer to the corresponding DOM node and jQuery selection of the
    // ``root`` property, respectively.
    root: 'body',

    session: 'user_session',

    updateLocation: true,

    // The ``controllers`` property should be declared as an ``Array`` of
    // ``Promenade.Controller`` class references. These references are used
    // to instantiate ``Controller`` instances that will govern the routing
    // and behavior of the ``Application`` instance. After initialization is
    // complete, each class reference in this ``Array`` is replaced with a
    // corresponding class instance.
    controllers: [],

    // The ``models`` property should be declared as an ``Array`` of
    // ``Promenade.Model`` and / or ``Promenade.Collection`` class references.
    // These references are used to instantiate the core models and collections
    // that represent the data to be presented by the ``Application``.
    models: [],

    view: null,

    initialize: function(options) {
      Backbone.Router.prototype.initialize.apply(this, arguments);
      var view = this.view;
      this.view = null;

      this._initializeModels();

      // All instantiated resources are listened to for ``'sync'`` events in
      // order to support data propagation.
      this.listenTo(this, 'before:sync', this._onBeforeSync);
      this.listenTo(this, 'sync', this._onSync);

      this.cid = _.uniqueId();
      this._ensureRoot();

      this.initializes = this.setup().then(_.bind(function() {
        this.useView(view);
      }, this));
    },

    navigate: function(fragment, options) {
      fragment = this.parseFragment(fragment);

      if (this.updateLocation === false) {
        return Backbone.history.loadUrl(fragment);
      }

      return Backbone.Router.prototype.navigate.call(this, fragment, options);
    },

    parseFragment: function(fragment) {
      return _.isString(fragment) ? fragment.replace(/^\//, '') : fragment;
    },

    setup: function() {
      return (new $.Deferred()).resolve().promise();
    },

    // The ``getResource`` method can be called to lookup a backing datastore
    // when it can be either a ``Model`` or ``Collection`` instance. By default,
    // ``Collection`` instances are given preference.
    getResource: function(type) {
      return this.getCollectionForType(type) || this.getModelForType(type);
    },

    // Automatically looks up a ``Collection`` for a given ``type``.
    getCollectionForType: function(type) {
      return this[this.getCollectionName(type)];
    },

    // Similarly, looks up a ``Model`` for a given ``type``.
    getModelForType: function(type) {
      return this[this.getModelName(type)];
    },

    // These methods exist for the purpose of more predictable canonicalization
    // of property names given a ``type``.
    getCollectionName: function(type) {
      return this.camelize(type) + 'Collection';
    },

    getModelName: function(type) {
      return this.camelize(type) + 'Model';
    },

    hasSession: function() {
      return !!this.getSession();
    },

    getSession: function() {
      return this.getModelForType(_.result(this, 'session'));
    },

    // When assigning ``Collection`` and ``Model`` instances to the
    // ``Application`` instance as properties, we must gracefully hadnle cases
    // where a resolved ``type`` value is not camelized. This helper function
    // converted strings separated with ``'_'`` characters into camel-cased
    // strings.
    camelize: function(string) {
      var parts = string.split('_');
      var part;
      var i;

      string = '';

      for (i = 0; i < parts.length; ++i) {
        part = parts[i].toLowerCase();

        if (!part) {
          continue;
        }

        if (i !== 0) {
          part = part.substr(0, 1).toUpperCase() +
                 part.substr(1, part.length - 1);
        }

        string += part;
      }

      return string;
    },

    // ``useView`` is an idempotent way to set the main layout of an
    // ``Application`` instance. The method accepts a string, class reference
    // or ``View`` instance.
    useView: function(View) {
      var view;

      // When no argument is provided, the method returns immediately.
      if (!View) {
        return;
      }

      // When the argument is a ``String``, it is resolved as a module using
      // an AMD API.
      if (_.isString(View)) {
        View = require(View);
      }

      // If we already have a ``view`` set on the ``Application`` instance, the
      // view is compared to the parameter provided. If ``view`` is an instance
      // of ``View``, or if ``view`` and ``View`` are the same, the method
      // returns immediately.
      if (this.view) {
        if ((_.isFunction(View) && this.view instanceof View) ||
            this.view === View) {
          return;
        }

        // Otherwise the current ``view`` is removed.
        this.stopListening(this.view, 'navigate', this.navigate);
        this.view.remove();
      }

      // The new ``view`` is created either by instantiating a provided class,
      // or by setting a provided instance.
      if (_.isFunction(View)) {
        view = new View({
          model: this.getSession(),
          app: this
        });
      } else {
        view = View;
      }

      // Finally, the new ``view`` instance is rendered and appended to the
      // ``rootElement`` of the ``Application`` instance.
      this.listenTo(view, 'navigate', this.navigate);
      view.render();
      this.$rootElement.append(view.$el);

      this.view = view;
    },

    _ensureRoot: function() {
      // The ``$rootElement`` and ``rootElement`` properties are created on the
      // ``Application`` instance during initialization.
      this.$rootElement = $(this.root);
      this.rootElement = this.$rootElement.get(0);

      this.$rootElement.on('click.promenade' + this.cid,
                           '.route-link', _.bind(this._onClickRouteLink, this));
    },

    _onClickRouteLink: function(event) {
      var $el = $(event.currentTarget);
      var href = $el.attr('href') || $el.data('href');

      if (href) {
        this.navigate(href, { trigger: true });
        return false;
      }

      throw new Error('A route link was clicked, but no HREF was found.');
    },

    // Upon initialization, and ``Application`` iterates through the list of
    // provided classes associated with its ``models`` property. Each of these
    // classes is instantiated and cached against its ``type`` and ``namespace``
    // values, separately, if available.
    _initializeModels: function() {
      this._namespace = {};

      _.each(this.models, function(ModelClass) {
        var model = new ModelClass(null, {
          app: this
        });
        var type = _.result(model, 'type');
        var namespace = _.result(model, 'namespace');


        if (model instanceof Backbone.Collection) {
          this[this.getCollectionName(type)] = model;
        } else if (model instanceof Backbone.Model) {
          this[this.getModelName(type)] = model;
        }

        if (namespace) {
          this._namespace[namespace] = model;
        }
      }, this);
    },

    // When a resource triggers a ``'sync'`` event, the ``Application`` observes
    // the network response to determine if there is any data that applies to
    // resources in other namespaces. If there is, the data in the namespace is
    // propagated to the known corresponding resources.
    _onBeforeSync: function(model, response, options) {
      var originalNamespace = _.result(model, 'namespace');
      var propagates = _.result(model, 'propagates');

      options = _.defaults(options || {}, {
        propagate: true,
        update: true
      });

      if (!options.propagate) {
        return;
      }

      _.each(response, function(data, key) {
        var otherModel = this._namespace[key];
        var otherType;
        var otherData;

        if (key !== originalNamespace && propagates[key] !== false &&
            (otherModel instanceof Backbone.Model ||
             otherModel instanceof Backbone.Collection)) {
          otherData = otherModel.parse.call(otherModel, response);
          otherModel.set(otherData);

          otherType = _.result(otherModel, 'type');

          if (!options.update) {
            return;
          }

          if (otherType) {
            this.trigger('update:' + otherType, otherModel);
            otherModel.trigger('update', otherModel);
          }
        }
      }, this);
    },

    _onSync: function(model, response, options) {
      var type = _.result(model, 'type');

      options = _.defaults(options || {}, {
        update: true
      });

      if (!options.update) {
        return;
      }

      this.trigger('update:' + type, model);
      model.trigger('update', model);
    },

    // The default ``_bindRoutes`` behavior is extended to support the
    // ``controllers`` property of the ``Application``. All provided
    // ``Controller`` classes are instantiated and references are help
    // by the ``Application``.
    _bindRoutes: function() {
      Backbone.Router.prototype._bindRoutes.apply(this, arguments);

      this.controllers = _.map(this.controllers, function(Controller) {

        var controller = new Controller({
          app: this
        });

        // When a ``Controller`` is instantiated, it defines the ``routes`` that
        // it can support. These ``routes`` are each mapped to a ``route`` in
        // ``Application``, which is a ``Backbone.Router`` derivative.
        _.each(controller.routes, function(handler, route) {
          this.route(route, route, _.bind(function() {
            _.each(this.controllers, function(_controller, index) {
              if (_controller !== controller && !_controller.handlesRoute(route)) {
                _controller.setInactive();
              }
            });
            handler.apply(controller, arguments);
          }, this));
        }, this);

        return controller;
      }, this);
    }
  });

  return Application;
});

(function() {
  'use strict';

  define('promenade',['promenade/view', 'promenade/view/collection', 'promenade/view/form', 'promenade/model',
          'promenade/controller', 'promenade/application', 'promenade/region',
          'promenade/object', 'promenade/collection', 'promenade/event'],
         function(View, CollectionView, FormView, Model,  Controller, Application,
                  Region, PromenadeObject, Collection, EventApi) {
    return {
      Model: Model,
      Collection: Collection,
      View: View,
      CollectionView: CollectionView,
      FormView: FormView,
      Controller: Controller,
      Application: Application,
      Region: Region,
      Event: EventApi,
      'Object': PromenadeObject
    };
  });
})();

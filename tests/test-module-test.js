import { TestModule, getContext } from 'ember-test-helpers';
import test from 'tests/test-support/qunit-test';
import qunitModuleFor from 'tests/test-support/qunit-module-for';
import { setResolverRegistry } from 'tests/test-support/resolver';

function moduleFor(fullName, description, callbacks) {
  var module = new TestModule(fullName, description, callbacks);
  qunitModuleFor(module);
}

function setupRegistry() {
  setResolverRegistry({
    'component:x-foo':           Ember.Component.extend(),
    'component:not-the-subject': Ember.Component.extend(),
    'foo:thing': Ember.Object.extend({
      fromDefaultRegistry: true
    })
  });
}

var a = 0;
var b = 0;
var beforeSetupOk = false;
var afterTeardownOk = false;

var callbackOrder, setupContext, teardownContext, beforeSetupContext, afterTeardownContext;

moduleFor('component:x-foo', 'TestModule callbacks', {
  beforeSetup: function() {
    beforeSetupContext = this;
    callbackOrder = [ 'beforeSetup' ];

    setupRegistry();
  },

  setup: function() {
    setupContext = this;
    callbackOrder.push('setup');

    ok(setupContext !== beforeSetupContext);
  },

  teardown: function() {
    teardownContext = this;
    callbackOrder.push('teardown');

    deepEqual(callbackOrder, [ 'beforeSetup', 'setup', 'teardown']);
    equal(setupContext, teardownContext);
  },

  afterTeardown: function() {
    afterTeardownContext = this;
    callbackOrder.push('afterTeardown');
    equal(this.context, undefined, "don't leak the this.context");
    equal(getContext(), undefined, "don't leak the internal context");
    deepEqual(callbackOrder, [ 'beforeSetup', 'setup', 'teardown', 'afterTeardown']);
    equal(afterTeardownContext, beforeSetupContext);
    ok(afterTeardownContext !== teardownContext);
  }
});

test("setup callbacks called in the correct order", function() {
  deepEqual(callbackOrder, [ 'beforeSetup', 'setup' ]);
});

moduleFor('component:x-foo', 'component:x-foo -- setup context', {
  beforeSetup: function() {
    setupRegistry();
  },

  setup: function() {
    this.subject({
      name: 'Max'
    });

    var thingToRegisterWith = this.registry || this.container;
    thingToRegisterWith.register('service:blah', Ember.Object.extend({
      purpose: 'blabering'
    }));
  }
});

test("subject can be initialized in setup", function() {
  equal(this.subject().name, 'Max');
});

test("can lookup factory registered in setup", function() {
  var service = this.container.lookup('service:blah');

  equal(service.get('purpose'), 'blabering');
});

moduleFor('component:x-foo', 'component:x-foo -- callback context', {
  beforeSetup: function() {
    setupRegistry();
  },

  getSubjectName: function() {
    return this.subjectName;
  }
});

test("callbacks are called in the context of the module", function() {
  equal(this.getSubjectName(), 'component:x-foo');
});

moduleFor('component:x-foo', 'component:x-foo -- created subjects are cleaned up', {
  beforeSetup: function() {
    setupRegistry();
  },

  afterTeardown: function() {
    var subject = this.cache.subject;

    ok(subject.isDestroyed);
  }
});

test("subject's created in a test are destroyed", function() {
  this.subject();
});

moduleFor('component:x-foo', 'component:x-foo -- uncreated subjects do not error', {
  beforeSetup: function() {
    setupRegistry();
  }
});

test("subject's created in a test are destroyed", function() {
  expect(0);
});

moduleFor('component:x-foo', 'component:x-foo -- without needs or `integration: true`', {
  beforeSetup: setupRegistry()
});

test("knows nothing about our non-subject component", function() {
  var otherComponent = this.container.lookup('component:not-the-subject');
  equal(null, otherComponent, "We shouldn't know about a non-subject component");
});

moduleFor('component:x-foo', 'component:x-foo -- when needing another component', {
  beforeSetup: setupRegistry(),
  needs: ['component:not-the-subject']
});

test("needs gets us the component we need", function() {
  var otherComponent = this.container.lookup('component:not-the-subject');
  ok(otherComponent, "another component can be resolved when it's in our needs array");
});

moduleFor('component:x-foo', 'component:x-foo -- `integration: true`', {
  beforeSetup: function() {
    setupRegistry();
    ok(!this.callbacks.integration, "integration property should be removed from callbacks");
    ok(this.isIntegration, "isIntegration should be set when we set `integration: true` in callbacks");
  },
  integration: true
});

test("needs is not needed (pun intended) when integration is true", function() {
  var otherComponent = this.container.lookup('component:not-the-subject');
  ok(otherComponent, 'another component can be resolved when integration is true');
});

test("throws an error when declaring integration: true and needs in the same module", function() {
  expect(3);

  var result = false;

  try {
    moduleFor('component:x-foo', {
      integration: true,
      needs: ['component:x-bar']
    });
  } catch(err) {
    result = true;
  }

  ok(result, "should throw an Error when integration: true and needs are provided");
});

moduleFor('component:x-foo', 'should be able to override factories in integration mode', {
  beforeSetup: function() {
    setupRegistry();
  },

  integration: true
});

test('gets the default by default', function() {
  var thing = this.container.lookup('foo:thing');

  ok(thing.fromDefaultRegistry, 'found from the default registry');
});

test('can override the default', function() {
  this.registry.register('foo:thing', Ember.Object.extend({
    notTheDefault: true
  }));
  var thing = this.container.lookup('foo:thing');

  ok(!thing.fromDefaultRegistry, 'should not be found from the default registry');
  ok(thing.notTheDefault, 'found from the overridden factory');
});

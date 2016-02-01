import Ember from 'ember';
import getOwner from 'ember-getowner-polyfill';
import DS from 'ember-data';

const {
  computed,
  computed: {
    notEmpty
  },
  inject,
  isEmpty
} = Ember;

const {
  attr,
  hasMany
} = DS;

export default DS.Model.extend({
  providerType: attr('string'),
  features: hasMany('feature', { async: true, dependent: 'destroy' }),

  availableFeatures: [],
  hasFeatures: notEmpty('features'),

  // TODO can and should we make it an attr('string', {defaultValue: 'initializing'}) do we start with 'initializing' on a reload?
  // one of ['initializing', 'loaded', 'unknown']
  lifecycle: 'initializing',

  config: computed('providerType', function() {
    const owner = getOwner(this),
      factoryType = 'provider',
      providerType = this.get('providerType'),
      providerFactory = `${factoryType}:${providerType}`;

    if (name === '_providers') {
      throw new TypeError(`${providerFactory} is internal!`);
    }

    const config = owner.lookup(providerFactory);

    if (!config) {
      throw new TypeError(`Unknown ProviderFactory: ${providerFactory}`);
    }

    // Set missing defaults
    if (config.get('ajaxOptions.dataType') === 'jsonp') {
      config.set('ajaxOptions.jsonp', 'callback');
    }

    return config;
  }),

  // Fetch logic
  fetcher: inject.service(),

  fetchData() {
    this.get('fetcher').run(this);
  },

  updateFeatures(items) {
    items
      .forEach((item) => {
        this.get('store')
          .queryRecord('feature', {
            filter: { provider: this.get('id'), name: item.name }
          })
          .then((feature) => {
            if (!isEmpty(feature)) {
              feature.setProperties(item);
              feature.save();
            }
          });
      });
  },

  setFeatures(items) {
    // TODO validate array of hashes

    // Normalize data
    const availableFeatures = items
      .toArray()
      .map((item) => {
        item.mood = item.mood || 'unknown';
        return item;
      });

    // We use them in the settings
    this.set('availableFeatures', availableFeatures);

    // Update with new data
    this.updateFeatures(availableFeatures);
    this.set('lifecycle', 'loaded');
  },

  setError(reason) {
    console.log('Error', reason);
    this.set('lifecycle', 'error');
  },

  // Decorator methods
  displayName: computed('config', 'userParams', function() {
    return this.get('userParams.name') || this.get('config.name');
  })
});


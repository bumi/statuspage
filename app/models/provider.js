import Ember from 'ember'
import Feature from 'statuspage/models/feature'
import DS from 'ember-data'

const {
  computed,
  computed: {
    notEmpty
  },
  getOwner,
  inject,
  isEmpty
} = Ember

export default DS.Model.extend({

  // This service is responsible for loading upstream data.
  fetcher: inject.service(),

  // This corresponds to a filename in the `providers` directory.
  // E.g. "aws" or "heroku". You can think of it as a class name.
  providerType: '',

  // Which features are we interested in? This comes from `config.json`.
  // E.g. `{ id: 'api', comment: 'This is important.' }`
  desiredFeatures: [],

  // The actual features (instances) we show on the page.
  // Basically the intersection of `availableFeatures` and `desiredFeatures`.
  features: [],

  // Can be 'initializing', 'loaded', or 'error'.
  // It is 'loaded' once the upstream data was fetched and 'error' on errors.
  lifecycle: 'initializing',

  // If something went wrong, this is where we store the error message.
  comment: '',

  // Just a convenience setter to update the lifecycle from the outside.
  failed (message) {
    this.set('lifecycle', 'error')
    this.set('comment', message)
  },

  // Loads the upstream data from the provider's status page.
  // There is a callback wich will evoke `applyUpstream` on success.
  fetchUpstream () {
    this.get('fetcher').run(this)
  },

  // Instantiates Features by using the corresponding upstream items.
  applyUpstream (items) {

    // Which features does this provider have in its upstream data?
    // These are in the format `{ name: 'Api', mood: 'critical' }`
    // Let us convert that into temporary feature instances.
    const availableFeatures = items.toArray().map((item) => {
      return Feature.create({
        providerName: this.get('name'),
        featureName: item.name,
        mood: item.mood
      })
    })

    // We don't necessarily want to use all available features.
    // If no specific features were demanded, we're already done.
    if (isEmpty(this.get('desiredFeatures'))) {
      return this.applyFeatures(availableFeatures)
    }

    // If a feature was desired, we amend it with the custom configuration.
    const desiredFeatures = availableFeatures.filter((feature) => {
      const desiredFeature = this.get('desiredFeatures').findBy('id', feature.get('id'))
      if (desiredFeature) {
        feature.set('comment', desiredFeature.comment)
      }
      return desiredFeature
    })

    this.applyFeatures(desiredFeatures)
  },

  applyFeatures (newFeatures) {
    this.set('features', newFeatures)
    this.set('lifecycle', 'loaded')
  },

  name: computed('config', function() {
    return this.get('config.name')
  }),

  config: computed('providerType', function () {
    const owner = getOwner(this)
    const factoryType = 'provider'
    const providerType = this.get('providerType')
    const providerFactory = `${factoryType}:${providerType}`

    if (name === '_providers') {
      throw new TypeError(`${providerFactory} is internal!`)
    }

    const config = owner.lookup(providerFactory)

    if (!config) {
      throw new TypeError(`Unknown ProviderFactory: ${providerFactory}`)
    }

    // Set missing defaults
    if (config.get('ajaxOptions.dataType') === 'jsonp') {
      config.set('ajaxOptions.jsonp', 'callback')
    }

    return config
  })
})


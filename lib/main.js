'use babel'

import {CompositeDisposable} from 'atom'
import {GocodeProvider} from './gocodeprovider'

export default {
  environment: null,
  goconfig: null,
  goget: null,
  provider: null,
  subscriptions: null,
  dependenciesInstalled: null,

  activate () {
    this.subscriptions = new CompositeDisposable()
    require('atom-package-deps').install('autocomplete-go').then(() => {
      this.dependenciesInstalled = true
    }).catch((e) => {
      console.log(e)
    })
  },

  deactivate () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.goconfig = null
    this.goget = null
    this.provider = null
    this.dependenciesInstalled = null
  },

  provide () {
    return this.getProvider()
  },

  getProvider () {
    if (this.provider) {
      return this.provider
    }
    this.provider = new GocodeProvider(
      () => { return this.getGoconfig() },
      () => { return this.getGoget() },
      () => { return this.getEnvironment() }
    )
    this.subscriptions.add(this.provider)
    return this.provider
  },

  getGoconfig () {
    if (this.goconfig) {
      return this.goconfig
    }
    return false
  },

  getEnvironment () {
    if (this.environment) {
      return this.environment
    }

    return process.env
  },

  consumeGoconfig (service) {
    this.goconfig = service
  },

  getGoget () {
    if (this.goget) {
      return this.goget
    }
    return false
  },

  consumeGoget (service) {
    this.goget = service
  },

  consumeEnvironment (environment) {
    this.environment = environment
  }
}

'use babel'

import {CompositeDisposable} from 'atom'
import {GocodeProvider} from './gocodeprovider'

export default {
  golangconfig: null,
  provider: null,
  subscriptions: null,

  activate () {
    this.subscriptions = new CompositeDisposable()
  },

  deactivate () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.goconfig = null
  },

  provide () {
    return this.getProvider()
  },

  getProvider () {
    if (this.provider) {
      return this.provider
    }
    this.provider = new GocodeProvider(() => { return this.getGoconfig() })
    return this.provider
  },

  getGoconfig () {
    if (this.goconfig) {
      return this.goconfig
    }
    return false
  },

  consumeGoconfig (service) {
    this.goconfig = service
  }
}

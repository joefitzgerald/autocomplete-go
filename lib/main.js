'use babel'

import {CompositeDisposable} from 'atom'
import {GocodeProvider} from './gocodeprovider'

export default {
  goconfig: null,
  goget: null,
  provider: null,
  subscriptions: null,
  dependenciesInstalled: null,
  toolCheckComplete: null,

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
    this.toolCheckComplete = null
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
      () => { return this.getGoget() }
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

  consumeGoconfig (service) {
    this.goconfig = service
    this.checkForGocode()
  },

  getGoget () {
    if (this.goget) {
      return this.goget
    }
    return false
  },

  consumeGoget (service) {
    this.goget = service
    this.checkForGocode()
  },

  checkForGocode () {
    if (!this.toolCheckComplete && this.goconfig && this.goget) {
      this.goconfig.locator.findTool('gocode').then((cmd) => {
        if (!cmd) {
          this.toolCheckComplete = true
          this.goget.get({
            name: 'autocomplete-go',
            packageName: 'gocode',
            packagePath: 'github.com/nsf/gocode',
            type: 'missing'
          }).then((r) => {
            if (!r.success) {
              console.log('gocode is not available and could not be installed via "go get -u github.com/nsf/gocode"; please manually install it to enable autocomplete behavior.')
            }
          }).catch((e) => {
            console.log(e)
          })
        }
      })
    }
  }
}

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
  toolRegistered: null,
  proposeBuiltins: true,
  unimportedPackages: true,

  activate () {
    this.subscriptions = new CompositeDisposable()
    require('atom-package-deps').install('autocomplete-go').then(() => {
      this.dependenciesInstalled = true
    }).catch((e) => {
      console.log(e)
    })

    this.subscriptions.add(atom.config.observe('autocomplete-go.proposeBuiltins', (value) => {
      this.proposeBuiltins = value
      this.toggleGocodeConfig()
    }))
    this.subscriptions.add(atom.config.observe('autocomplete-go.unimportedPackages', (value) => {
      this.unimportedPackages = value
      this.toggleGocodeConfig()
    }))
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
    this.toolRegistered = null
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
    this.toggleGocodeConfig()
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

  toggleGocodeConfig () {
    if (this.goconfig) {
      this.goconfig.locator.findTool('gocode').then((cmd) => {
        if (!this.goconfig) {
          return
        }
        this.goconfig.executor.exec(cmd, ['set', 'unimported-packages', this.unimportedPackages]).then((r) => {
          if (r.stderr && r.stderr.trim() !== '') {
            console.log('autocomplete-go: (stderr) ' + r.stderr)
          }
        }).then(() => {
          if (!this.goconfig) {
            return
          }
          return this.goconfig.executor.exec(cmd, ['set', 'propose-builtins', this.proposeBuiltins]).then((r) => {
            if (r.stderr && r.stderr.trim() !== '') {
              console.log('autocomplete-go: (stderr) ' + r.stderr)
            }
          })
        })
      }).catch((e) => {
        console.log(e)
      })
    }
  },

  checkForGocode () {
    if (!this.toolRegistered && this.goget) {
      this.subscriptions.add(this.goget.register('github.com/nsf/gocode', (outcome) => {
        if (!this.goconfig) {
          return
        }
        this.goconfig.locator.findTool('gocode').then((cmd) => {
          if (cmd) {
            this.goconfig.executor.exec(cmd, ['close']).then((r) => {
              if (r.stderr && r.stderr.trim() !== '') {
                console.log('autocomplete-go: (stderr) ' + r.stderr)
              }
            }).catch((e) => {
              console.log(e)
            })
          }
        })
      }))
    }

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

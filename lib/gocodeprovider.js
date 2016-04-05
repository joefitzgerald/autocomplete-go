'use babel'

import {CompositeDisposable} from 'atom'
import path from 'path'
import _ from 'lodash'

class GocodeProvider {
  constructor (goconfigFunc, gogetFunc) {
    this.goconfig = goconfigFunc
    this.goget = gogetFunc
    this.subscriptions = new CompositeDisposable()
    this.subscribers = []

    this.selector = '.source.go'
    this.inclusionPriority = 1
    this.excludeLowerPriority = atom.config.get('autocomplete-go.suppressBuiltinAutocompleteProvider')
    this.suppressForCharacters = []
    this.disableForSelector = atom.config.get('autocomplete-go.scopeBlacklist')
    let suppressSubscrition = atom.config.observe('autocomplete-go.suppressActivationForCharacters', (value) => {
      this.suppressForCharacters = _.map(value, (c) => {
        let char = c ? c.trim() : ''
        char = (() => {
          switch (false) {
            case char.toLowerCase() !== 'comma':
              return ','
            case char.toLowerCase() !== 'newline':
              return '\n'
            case char.toLowerCase() !== 'space':
              return ' '
            case char.toLowerCase() !== 'tab':
              return '\t'
            default:
              return char
          }
        })()
        return char
      })
      this.suppressForCharacters = _.compact(this.suppressForCharacters)
    })
    this.subscriptions.add(suppressSubscrition)
    this.funcRegex = /^(?:func[(]{1})([^\)]*)(?:[)]{1})(?:$|(?:\s)([^\(]*$)|(?: [(]{1})([^\)]*)(?:[)]{1}))/i
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.goconfig = null
    this.subscribers = null
    this.selector = null
    this.inclusionPriority = null
    this.excludeLowerPriority = null
    this.suppressForCharacters = null
    this.disableForSelector = null
    this.funcRegex = null
  }

  ready () {
    if (!this.goconfig) {
      return false
    }
    let config = this.goconfig()
    if (!config) {
      return false
    }
    return true
  }

  isValidEditor (editor) {
    if (!editor || !editor.getGrammar) {
      return false
    }
    let grammar = editor.getGrammar()
    if (!grammar) {
      return false
    }
    if (grammar.scopeName === 'source.go') {
      return true
    }
    return false
  }

  characterIsSuppressed (char) {
    return this.suppressForCharacters.indexOf(char) !== -1
  }

  getSuggestions (options) {
    let p = new Promise((resolve) => {
      if (!options || !this.ready() || !this.isValidEditor(options.editor)) {
        return resolve()
      }
      let config = this.goconfig()
      let buffer = options.editor.getBuffer()
      if (!buffer || !options.bufferPosition) {
        return resolve()
      }

      let index = buffer.characterIndexForPosition(options.bufferPosition)
      let text = options.editor.getText()
      if (index > 0 && this.characterIsSuppressed(text[index - 1])) {
        return resolve()
      }
      let offset = Buffer.byteLength(text.substring(0, index), 'utf8')

      let locatorOptions = {
        file: options.editor.getPath(),
        directory: path.dirname(options.editor.getPath())
      }

      let args = ['-f=json', 'autocomplete', buffer.getPath(), offset]
      config.locator.findTool('gocode', locatorOptions).then((cmd) => {
        if (!cmd) {
          resolve()
          return false
        }
        let cwd = path.dirname(buffer.getPath())
        let env = config.environment(locatorOptions)
        config.executor.exec(cmd, args, {cwd: cwd, env: env, input: text}).then((r) => {
          if (r.stderr && r.stderr.trim() !== '') {
            console.log('autocomplete-go: (stderr) ' + r.stderr)
          }
          let messages = []
          if (r.stdout && r.stdout.trim() !== '') {
            messages = this.mapMessages(r.stdout, options.editor, options.bufferPosition)
          }
          if (!messages || messages.length < 1) {
            return resolve()
          }
          resolve(messages)
        }).catch((e) => {
          console.log(e)
          resolve()
        })
      })
    })

    if (this.subscribers && this.subscribers.length > 0) {
      for (let subscriber of this.subscribers) {
        subscriber(p)
      }
    }
    return p
  }

  onDidGetSuggestions (s) {
    if (this.subscribers) {
      this.subscribers.push(s)
    }
  }

  mapMessages (data, editor, position) {
    if (!data) {
      return []
    }
    let res
    try {
      res = JSON.parse(data)
    } catch (e) {
      if (e && e.handle) {
        e.handle()
      }
      atom.notifications.addError('gocode error', {
        detail: data,
        dismissable: true
      })
      console.log(e)
      return []
    }

    let numPrefix = res[0]
    let candidates = res[1]
    if (!candidates) {
      return []
    }
    let prefix = editor.getTextInBufferRange([[position.row, position.column - numPrefix], position])
    let suffix = false
    try {
      suffix = editor.getTextInBufferRange([position, [position.row, position.column + 1]])
    } catch (e) {
      console.log(e)
    }
    let suggestions = []
    for (let c of candidates) {
      let suggestion = {
        replacementPrefix: prefix,
        leftLabel: c.type || c.class,
        type: this.translateType(c.class)
      }
      if (c.class === 'func' && (!suffix || suffix !== '(')) {
        suggestion = this.upgradeSuggestion(suggestion, c)
      } else {
        suggestion.text = c.name
      }
      if (suggestion.type === 'package') {
        suggestion.iconHTML = '<i class="icon-package"></i>'
      }
      suggestions.push(suggestion)
    }
    return suggestions
  }

  translateType (type) {
    if (type === 'func') {
      return 'function'
    }
    if (type === 'var') {
      return 'variable'
    }
    if (type === 'const') {
      return 'constant'
    }
    if (type === 'PANIC') {
      return 'panic'
    }
    return type
  }

  upgradeSuggestion (suggestion, c) {
    if (!c || !c.type || c.type === '') {
      return suggestion
    }
    let match = this.funcRegex.exec(c.type)
    if (!match || !match[0]) { // Not a function
      suggestion.snippet = c.name + '()'
      suggestion.leftLabel = ''
      return suggestion
    }
    suggestion.leftLabel = match[2] || match[3] || ''
    suggestion.snippet = this.generateSnippet(c.name, match)
    return suggestion
  }

  generateSnippet (name, match) {
    let signature = name
    if (!match || !match[1] || match[1] === '') {
      // Has no arguments, shouldn't be a snippet, for now
      return signature + '()'
    }
    let args = match[1].split(/, /)
    args = _.map(args, (a) => {
      if (!a || a.length <= 2) {
        return a
      }
      if (a.substring(a.length - 2, a.length) === '{}') {
        return a.substring(0, a.length - 1) + '\\}'
      }
      return a
    })

    if (args.length === 1) {
      return signature + '(${1:' + args[0] + '})'
    }
    let i = 1
    for (let arg of args) {
      if (i === 1) {
        signature = signature + '(${' + i + ':' + arg + '}'
      } else {
        signature = signature + ', ${' + i + ':' + arg + '}'
      }
      i = i + 1
    }

    signature = signature + ')'
    return signature
    // TODO: Emit function's result(s) in snippet, when appropriate
  }
}
export {GocodeProvider}

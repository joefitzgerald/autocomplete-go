'use babel'
/* eslint-env jasmine */

import path from 'path'

describe('gocodeprovider', () => {
  let completionDelay = null
  let autocompleteplusMain = null
  let autocompleteManager = null
  let goconfigMain = null
  let autocompletegoMain = null
  let provider = null
  let editor = null
  let editorView = null
  let workspaceElement = null
  let suggestionsPromise = null

  beforeEach(() => {
    waitsForPromise(() => {
      return atom.packages.activatePackage('language-go').then(() => {
        return atom.packages.activatePackage('autocomplete-plus')
      }).then((pack) => {
        autocompleteplusMain = pack.mainModule
        return atom.packages.activatePackage('go-config')
      }).then((pack) => {
        goconfigMain = pack.mainModule
        return atom.packages.activatePackage('autocomplete-go')
      }).then((pack) => {
        autocompletegoMain = pack.mainModule
      })
    })

    waitsFor(() => {
      return autocompleteplusMain.autocompleteManager && autocompleteplusMain.autocompleteManager.ready
    })

    runs(() => {
      workspaceElement = atom.views.getView(atom.workspace)
      jasmine.attachToDOM(workspaceElement)

      // autocomplete-plus
      autocompleteManager = autocompleteplusMain.getAutocompleteManager()
      spyOn(autocompleteManager, 'displaySuggestions').andCallThrough()
      spyOn(autocompleteManager, 'showSuggestionList').andCallThrough()
      spyOn(autocompleteManager, 'hideSuggestionList').andCallThrough()
      atom.config.set('autocomplete-plus.enableAutoActivation', true)
      completionDelay = 100
      atom.config.set('autocomplete-plus.autoActivationDelay', completionDelay)
      completionDelay += 100 // Rendering delay

      // autocomplete-go
      atom.config.set('autocomplete-go.snippetMode', 'nameAndType')
      provider = autocompletegoMain.getProvider()
      spyOn(provider, 'getSuggestions').andCallThrough()
      provider.onDidInsertSuggestion = jasmine.createSpy()
      provider.onDidGetSuggestions((p) => {
        suggestionsPromise = p
      })
    })

    waitsFor(() => {
      return provider.ready()
    })
  })

  afterEach(() => {
    if (provider !== null) {
      jasmine.unspy(provider, 'getSuggestions')
      provider.dispose()
      provider = null
    }

    if (autocompleteManager !== null) {
      jasmine.unspy(autocompleteManager, 'displaySuggestions')
      jasmine.unspy(autocompleteManager, 'hideSuggestionList')
      jasmine.unspy(autocompleteManager, 'showSuggestionList')
      autocompleteManager.dispose()
      autocompleteManager = null
    }

    if (autocompleteplusMain !== null) {
      autocompleteplusMain.deactivate()
      autocompleteplusMain = null
    }

    if (autocompletegoMain !== null) {
      autocompletegoMain.deactivate()
      autocompletegoMain = null
    }

    if (goconfigMain !== null) {
      goconfigMain.deactivate()
      goconfigMain = null
    }

    if (editor !== null) {
      // TODO Close
      editor = null
    }

    if (editorView !== null) {
      // TODO Close
      editorView = null
    }

    if (workspaceElement !== null) {
      // TODO Close
      workspaceElement = null
    }
  })

  describe('when the basic file is opened', () => {
    beforeEach(() => {
      waitsForPromise(() => {
        return atom.workspace.open('basic' + path.sep + 'main.go').then((e) => {
          editor = e
          editorView = atom.views.getView(editor)
        })
      })
    })

    describe('when snippetMode is nameAndType', () => {
      beforeEach(() => {
        atom.config.set('autocomplete-go.snippetMode', 'nameAndType')
      })

      it('generates snippets with name and type argument placeholders', () => {
        let suggestions = null
        runs(() => {
          expect(provider).toBeDefined()
          expect(provider.getSuggestions).not.toHaveBeenCalled()
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
          editor.setCursorScreenPosition([5, 6])
          editor.insertText('P')
          advanceClock(completionDelay)
        })

        waitsFor(() => {
          return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
        })

        waitsForPromise(() => {
          return suggestionsPromise.then((s) => {
            suggestions = s
          })
        })

        runs(() => {
          expect(provider.getSuggestions).toHaveBeenCalled()
          expect(provider.getSuggestions.calls.length).toBe(1)
          expect(suggestions).toBeTruthy()
          expect(suggestions.length).toBeGreaterThan(0)
          expect(suggestions[0]).toBeTruthy()
          expect(suggestions[0].displayText).toBe('Print(a ...interface{})')
          expect(suggestions[0].snippet).toBe('Print(${1:a ...interface{\\}})$0')
          expect(suggestions[0].replacementPrefix).toBe('P')
          expect(suggestions[0].type).toBe('function')
          expect(suggestions[0].leftLabel).toBe('n int, err error')
          editor.backspace()
        })
      })
    })

    describe('when snippetMode is name', () => {
      beforeEach(() => {
        atom.config.set('autocomplete-go.snippetMode', 'name')
      })

      it('generates snippets with name argument placeholders', () => {
        let suggestions = null
        runs(() => {
          expect(provider).toBeDefined()
          expect(provider.getSuggestions).not.toHaveBeenCalled()
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
          editor.setCursorScreenPosition([5, 6])
          editor.insertText('P')
          advanceClock(completionDelay)
        })

        waitsFor(() => {
          return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
        })

        waitsForPromise(() => {
          return suggestionsPromise.then((s) => {
            suggestions = s
          })
        })

        runs(() => {
          expect(provider.getSuggestions).toHaveBeenCalled()
          expect(provider.getSuggestions.calls.length).toBe(1)
          expect(suggestions).toBeTruthy()
          expect(suggestions.length).toBeGreaterThan(0)
          expect(suggestions[0]).toBeTruthy()
          expect(suggestions[0].displayText).toBe('Print(a ...interface{})')
          expect(suggestions[0].snippet).toBe('Print(${1:a})$0')
          expect(suggestions[0].replacementPrefix).toBe('P')
          expect(suggestions[0].type).toBe('function')
          expect(suggestions[0].leftLabel).toBe('n int, err error')
          editor.backspace()
        })
      })
    })

    describe('when snippetMode is none', () => {
      beforeEach(() => {
        atom.config.set('autocomplete-go.snippetMode', 'none')
      })

      it('generates snippets with no args', () => {
        let suggestions = null
        runs(() => {
          expect(provider).toBeDefined()
          expect(provider.getSuggestions).not.toHaveBeenCalled()
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
          editor.setCursorScreenPosition([5, 6])
          editor.insertText('P')
          advanceClock(completionDelay)
        })

        waitsFor(() => {
          return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
        })

        waitsForPromise(() => {
          return suggestionsPromise.then((s) => {
            suggestions = s
          })
        })

        runs(() => {
          expect(provider.getSuggestions).toHaveBeenCalled()
          expect(provider.getSuggestions.calls.length).toBe(1)
          expect(suggestions).toBeTruthy()
          expect(suggestions.length).toBeGreaterThan(0)
          expect(suggestions[0]).toBeTruthy()
          expect(suggestions[0].displayText).toBe('Print(a ...interface{})')
          expect(suggestions[0].snippet).toBe('Print($0)')
          expect(suggestions[0].replacementPrefix).toBe('P')
          expect(suggestions[0].type).toBe('function')
          expect(suggestions[0].leftLabel).toBe('n int, err error')
          editor.backspace()
        })
      })
    })
  })

  describe('when the go-plus-issue-307 file is opened', () => {
    let suggestions = null
    beforeEach(() => {
      waitsForPromise(() => {
        return atom.workspace.open('go-plus-issue-307' + path.sep + 'main.go').then((e) => {
          editor = e
          editorView = atom.views.getView(editor)
        })
      })
    })

    it('returns suggestions to autocomplete-plus scenario 1', () => {
      runs(() => {
        expect(provider).toBeDefined()
        expect(provider.getSuggestions).not.toHaveBeenCalled()
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
        editor.setCursorScreenPosition([13, 0])
        editor.insertText('\tSayHello("world")')
        suggestions = null
        suggestionsPromise = null
        advanceClock(completionDelay)
      })

      runs(() => {
        expect(provider.getSuggestions.calls.length).toBe(0)
        expect(suggestionsPromise).toBeFalsy()
        editor.insertText('.')
        advanceClock(completionDelay)
      })

      waitsFor(() => {
        return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
      })

      waitsForPromise(() => {
        return suggestionsPromise.then((s) => {
          suggestions = s
        })
      })

      runs(() => {
        expect(provider.getSuggestions).toHaveBeenCalled()
        expect(provider.getSuggestions.calls.length).toBe(1)
        expect(suggestions).toBeTruthy()
        expect(suggestions.length).toBeGreaterThan(0)
        expect(suggestions[0]).toBeTruthy()
        expect(suggestions[0].displayText).toBe('Fatal(v ...interface{})')
        expect(suggestions[0].snippet).toBe('Fatal(${1:v ...interface{\\}})$0')
        expect(suggestions[0].replacementPrefix).toBe('')
        expect(suggestions[0].type).toBe('function')
        expect(suggestions[0].leftLabel).toBe('')
        editor.backspace()
      })
    })

    it('returns suggestions to autocomplete-plus scenario 2', () => {
      runs(() => {
        expect(provider).toBeDefined()
        expect(provider.getSuggestions).not.toHaveBeenCalled()
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
        editor.setCursorScreenPosition([13, 0])
        editor.insertText('\tSayHello("world") ')
        suggestions = null
        suggestionsPromise = null
        advanceClock(completionDelay)
      })

      runs(() => {
        expect(provider.getSuggestions.calls.length).toBe(0)
        expect(suggestionsPromise).toBeFalsy()
        editor.insertText('.')
        advanceClock(completionDelay)
      })

      waitsFor(() => {
        return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
      })

      waitsForPromise(() => {
        return suggestionsPromise.then((s) => {
          suggestions = s
        })
      })

      runs(() => {
        expect(provider.getSuggestions).toHaveBeenCalled()
        expect(provider.getSuggestions.calls.length).toBe(1)
        expect(suggestions).toBeTruthy()
        expect(suggestions.length).toBeGreaterThan(0)
        expect(suggestions[0]).toBeTruthy()
        expect(suggestions[0].displayText).toBe('Fatal(v ...interface{})')
        expect(suggestions[0].snippet).toBe('Fatal(${1:v ...interface{\\}})$0')
        expect(suggestions[0].replacementPrefix).toBe('')
        expect(suggestions[0].type).toBe('function')
        expect(suggestions[0].leftLabel).toBe('')
        editor.backspace()
      })
    })

    it('returns suggestions to autocomplete-plus scenario 3', () => {
      runs(() => {
        expect(provider).toBeDefined()
        expect(provider.getSuggestions).not.toHaveBeenCalled()
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
        editor.setCursorScreenPosition([13, 0])
        editor.insertText('\tSayHello("world")  ')
        suggestions = null
        suggestionsPromise = null
        advanceClock(completionDelay)
      })

      runs(() => {
        expect(provider.getSuggestions.calls.length).toBe(0)
        expect(suggestionsPromise).toBeFalsy()
        editor.insertText('.')
        advanceClock(completionDelay)
      })

      waitsFor(() => {
        return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
      })

      waitsForPromise(() => {
        return suggestionsPromise.then((s) => {
          suggestions = s
        })
      })

      runs(() => {
        expect(provider.getSuggestions).toHaveBeenCalled()
        expect(provider.getSuggestions.calls.length).toBe(1)
        expect(suggestions).toBeTruthy()
        expect(suggestions.length).toBeGreaterThan(0)
        expect(suggestions[0]).toBeTruthy()
        expect(suggestions[0].displayText).toBe('Fatal(v ...interface{})')
        expect(suggestions[0].snippet).toBe('Fatal(${1:v ...interface{\\}})$0')
        expect(suggestions[0].replacementPrefix).toBe('')
        expect(suggestions[0].type).toBe('function')
        expect(suggestions[0].leftLabel).toBe('')
        editor.backspace()
      })
    })

    it('returns suggestions to autocomplete-plus scenario 4', () => {
      runs(() => {
        expect(provider).toBeDefined()
        expect(provider.getSuggestions).not.toHaveBeenCalled()
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
        editor.setCursorScreenPosition([13, 0])
        editor.insertText('\tSayHello("world")\t')
        suggestions = null
        suggestionsPromise = null
        advanceClock(completionDelay)
      })

      runs(() => {
        expect(provider.getSuggestions.calls.length).toBe(0)
        expect(suggestionsPromise).toBeFalsy()
        editor.insertText('.')
        advanceClock(completionDelay)
      })

      waitsFor(() => {
        return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
      })

      waitsForPromise(() => {
        return suggestionsPromise.then((s) => {
          suggestions = s
        })
      })

      runs(() => {
        expect(provider.getSuggestions).toHaveBeenCalled()
        expect(provider.getSuggestions.calls.length).toBe(1)
        expect(suggestions).toBeTruthy()
        expect(suggestions.length).toBeGreaterThan(0)
        expect(suggestions[0]).toBeTruthy()
        expect(suggestions[0].displayText).toBe('Fatal(v ...interface{})')
        expect(suggestions[0].snippet).toBe('Fatal(${1:v ...interface{\\}})$0')
        expect(suggestions[0].replacementPrefix).toBe('')
        expect(suggestions[0].type).toBe('function')
        expect(suggestions[0].leftLabel).toBe('')
        editor.backspace()
      })
    })
  })
})

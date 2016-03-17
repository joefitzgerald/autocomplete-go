# `autocomplete-go` [![Build Status](https://travis-ci.org/joefitzgerald/autocomplete-go.svg?branch=master)](https://travis-ci.org/joefitzgerald/autocomplete-go) [![Build status](https://ci.appveyor.com/api/projects/status/8oveg440vyy4oofq/branch/master?svg=true)](https://ci.appveyor.com/project/joefitzgerald/autocomplete-go/branch/master)


An [`autocomplete-plus`](https://github.com/atom/autocomplete-plus) provider for
the [`go`](https://golang.org) language that uses [`gocode`](https://github.com/nsf/gocode) to provide suggestions.

### Prerequisites

This package requires the following packages to be installed:

* [`environment`](https://atom.io/packages/environment)
* [`go-config`](https://atom.io/packages/go-config)

Additionally, you should have [`gocode`](https://github.com/nsf/gocode) installed and available on your path:

> `go get -u github.com/nsf/gocode`

If you have the [`go-get`](https://atom.io/packages/go-get) package installed, this package will prompt you to get gocode (if it is missing) or update gocode (if it is out of date).

### FAQ

> I am not getting suggestions I expect!

`gocode` uses the output from `go install` to provide its suggestions. You have a few options to ensure you always get up-to-date suggestions:

* Always run `go install ./...` in your package when you make a change
* Run `gocode set autobuild true` to have `gocode` attempt to run `go install ./...` for you
* Configure a package (like [build](https://atom.io/packages/build)) to run your build command on every save

### Configuration

* `scopeBlacklist`: Suggestions will not be shown when the cursor is inside the specified comma-delimited scope(s) (default: `.source.go .comment`)
* `suppressBuiltinAutocompleteProvider`: Suppress the provider built-in to the autocomplete-plus package when editing .go files (default: `true`)
* `suppressActivationForCharacters`: Suggestions will not be provided when you type one of the specified characters (default: ``comma, newline, space, tab, /, \, (, ), ", ', :,
;, <, >, ~, !, @, #, $, %, ^, &, *, |, +,
=, [, ], {, }, `, ~, ?, -``)

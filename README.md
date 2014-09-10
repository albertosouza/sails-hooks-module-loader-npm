# sails-hooks-module-loader-npm

Sails.js hook module loader to load modules from npm packages

[![build status](https://secure.travis-ci.org/albertosouza/sails-hooks-module-loader-npm.png)](http://travis-ci.org/albertosouza/sails-hooks-module-loader-npm)

## Installation

1 - Download it inside your sails.js project with:

```sh
npm install sails-hooks-module-loader-npm --save
```

2 - Create one hook with:

```js
// api/hooks/plugins/index.js

module.exports = require('sails-hooks-module-loader-npm').hook;

```

## Plugin / sails npm module:

### Plugin folder structure:

 ```
 - api
 - - models
 - - - [model1].js
 - - - [model2].js
 - - controllers
 - - - [controller1].js
 ```



## Credits
[Alberto Souza](https://github.com/albertosouza/) and contributors

## License

MIT

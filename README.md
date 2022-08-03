# Ragu

Yet another Markdown to static HTML generator. This one is based on [Noddity](http://noddity.com/), but with some twists.

You can use this as a CLI tool, or programmatically.

> Why is it named `ragu`? Because it's a family favorite sauce.

## Install

The usual ways:

```bash
npm install ragu
# or as a global CLI tool:
npm install -g ragu
```

## Setup

Before you can build your site, you'll need to configure a few things, and define your Markdown flavor using Micromark and mdast extensions.

You do that by creating a file `ragu.config.js` which exports a default options object:

```js
// TODO
import { raguConfig } from '@saibotsivad/ragu-config'
export { raguConfig as default }
```

## CLI

You just run `ragu [input] [output]` where the `[input]` is your content folder and `[output]` is where to put everything.

```bash
ragu /path/to/content /path/to/build
```

If you've got a config file set up, and that config file defines the `input` and `output` you can just do:

```bash
# if the config file is in the current directory
ragu -c # or --config
# if the config file is elsewhere
ragu -c /path/to/ragu.config.js
```

To run locally, you'll use the `--watch` (or `-w`) flag. This will automatically use `localhost:3000` for the base URL. You can manually specify a domain using `--domain` (or `-d`) e.g. for preview builds.

```bash
# typical local development
ragu -c -w
# specify custom "domain" to use different port
ragu -c -w -d "localhost:8080"
```

There aren't many CLI options, because everything is run through the config file.

## License

Published and released under the [Very Open License](http://veryopenlicense.com).

If you need a commercial license, [contact me here](https://davistobias.com/license?software=ragu).

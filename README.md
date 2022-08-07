# Ragu

A tasty little Markdown to HTML site generator with very few opinions.

> Why is it named `ragu`? Because it's a family favorite sauce. 🍝

## Install

The usual ways:

```bash
npm install ragu
# or as a global CLI tool:
npm install -g ragu
# you don't need to install
npx ragu -c
```

## Setup

Ragu does not have very many opinions cooked in, so before you can build your site you'll need to configure a few things.

You do that by creating a file `ragu.config.js` which exports a default options object:

```js
export default {
	input: './content',
	output: './public',
	// ... and lots of other options
}
```

If you want to use some pre-baked options, try the `ragu-alla-bolognese` configuration, which supports a lot of useful things:

```js
// ragu.config.js
import { config } from 'ragu-alla-bolognese'
// re-export as default
export { config as default }
```

## CLI

You just run `ragu [input] [output]` where the `[input]` is your content folder and `[output]` is where to put everything.

```bash
ragu /path/to/content /path/to/build
```

Or, if you've got a config file set up, and that config file defines the `input` and `output` you can just do:

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

There aren't many CLI options, because everything is defined in the config file.

You can also use Ragu without installing:

```bash
# uses the latest, that might be dangerous
npx ragu -c
# specify a version, probably safer
npx ragu@1.2.3 -c
```

## Configuration

Ragu does not have very many opinions, so you'll need to add your own (or use some pre-defined ones) before you can really use it.

<!-- TODO -->

## License

Published and released under the [Very Open License](http://veryopenlicense.com).

If you need a commercial license, [contact me here](https://davistobias.com/license?software=ragu).

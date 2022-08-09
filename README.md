# Ragu

A tasty little Markdown to HTML site generator with very few opinions.

> Why is it named `ragu`? Because it's a family favorite [sauce](https://en.wikipedia.org/wiki/Rag%C3%B9). 🍝

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

## Processing Flow

Understanding how Ragu works will help you see how it might differ from the may other similar softwares.

#### 1. Scan

The first action is to scan the input directory for files.

By default Ragu looks for all `.md` files, but you can pass in a filter function:

```js
// ragu.config.js
import { extname } = 'node:path'
const EXTENSIONS = [ '.md', '.txt' ]
export default {
	// ... other stuff, then ...
	filter: file => EXTENSIONS.includes(extname(file))
}
```

#### 2. Read Frontmatter

The filtered files are read using a [read stream](https://nodejs.org/api/fs.html#fscreatereadstreampath-options) to extract and parse the frontmatter/metadata string.

By default Ragu uses the normal triple dash separation, like this:

```md
---
title: My Cool Blog Post
published: true
---
```

You can also pass in a function to extract the string:

```js
// ragu.config.js
export default {
	// ... other stuff, then ...
	readFrontmatter: (stream, callback) => {
		let frontmatter = ''
		let end = 0
		const sections = []
		stream.on('data', data => {
			// append to `frontmatter`
			// increment `end`
			// be sure to call `stream.close()` when done
		})
		stream.on('end', () => {
			callback({ frontmatter, end })
		})
	},
}
```

The function is given a stream and a callback function. When you've read the full frontmatter string, call the `callback` function with an object containing these properties:

* `frontmatter: string` ***optional*** - The extracted string, exactly as you would pass it to the frontmatter parser.
* `end: integer` ***required*** - The cursor position to start reading content. For the above triple-dash example, the `end` would be the character count right after the last three dashes, including the newline character.
* `ignore: boolean` ***optional*** - Set this to true to have Ragu ignore this file in later steps of the process.

#### 3. Parse Frontmatter

The frontmatter string is passed through a parser to become your normalized metadata.

Ragu does not have an opinion on metadata parsers!

The most popular parser is probably [js-yaml](https://github.com/nodeca/js-yaml), which would look like this when configured (there are many options for parsing YAML):

```js
// ragu.config.js
import yaml from 'js-yaml'
export default {
	// ... other stuff, then ...
	parseFrontmatter: string => {
		const metadata = yaml.load(string)
		// do some normalization here as needed
		// things like date casting, etc.
		return { metadata }
	}
}
```

#### 4. Collect Metadata

After all files are parsed, the metadata and section strings are passed to a pre-render function for preparation. The output of this function is passed to the (later) render function as a single property, so here you would likely want to create things like collections, e.g. for "tags", "authors", and so on. Ragu has no opinions baked in here: if you don't provide this function, the property given to the renderer will be empty.

#### 5. Render Content

For each now fully parsed and prepared file, a render function is called, passing in the files parsed metadata, the 

#### 6. Finalize

Optional post-render process.

## License

Published and released under the [Very Open License](http://veryopenlicense.com).

If you need a commercial license, [contact me here](https://davistobias.com/license?software=ragu).

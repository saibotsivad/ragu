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

If you want to use some pre-baked options, try the `bolognese` configuration, which supports a lot of useful things:

```js
// ragu.config.js
import { config } from 'bolognese'
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
	filter: file => EXTENSIONS.includes(extname(file)),
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
	},
}
```

#### 4. Merge Site Metadata

After the frontmatter for all files is parsed, the resulting metadata is passed to a merge function as a map of filename to metadata.

The output of this is passed to the render function in the next step, so here is where you would likely want to create things like collections, e.g. for "tags", "authors", and so on.

Ragu has no opinions baked in here: if you don't provide this function, the property given to the renderer will be empty!

Here's an example of a merging function that you might be likely to use. In this example, the `site.js` is *not* a Ragu feature. Althought it is a common organizational strategy to move constant properties out to other files, Ragu *does not* auto-magically pull in data files (like `_data/site.yaml` for Jekyll and others).

```js
// site.js
export default {
	baseUrl: 'https://site.com',
}
// ragu.config.js
import sitewideProperties from './site.js'
export default {
	// ... other stuff, then ...
	mergeMetadata: (filenameToMetadata) => {
		const merged = {
			...sitewideProperties, // adds `baseUrl`
			authors: new Set(),
			tags: new Set(),
			rss: []
		}
		for (const filename in filenameToMetadata) {
			const { author, tags, published } = filenameToMetadata[filename]
			if (author) merged.authors.add(author)
			if (tags?.length) for (const tag of tags) merged.tags.add(tag)
			if (published) merged.rss.push(filename)
		}
		return merged
	},
}
```

The merging function can be `async`, for example if you need to do pre-render setup based on the merged metadata.

#### 5. Render Content

After all metadata is merged, a render function is called for each file.

To load the file, Ragu uses a [read stream](https://nodejs.org/api/fs.html#fscreatereadstreampath-options) with the `start` (character offset) being the `end` value given by the `readFrontmatter` function in Step 2. The read stream is passed to the render function, along with that files parsed metadata from Step 3 and the merged metadata from step 4.

The function is called with an options object and a callback function. The options object contains the following properties:

* `filepath: string` - The filepath of the content file, relative to the input directory, e.g. if `input` were `./content` this might be `articles/how-to-drive.md`.
* `metadata: Any` - This is whatever comes out of the frontmatter parser in Step 3. (Note: that means if the output `metadata` property is `undefined`, this property will also be `undefined`!)
* `site: Any` - This is whatever comes out of your merging function in Step 4. (If you don't provide a merging function, this property will not be set.)
* `stream: Readable` - The readable stream of the content file, starting after the `end` offset from Step 2.

The output from this render function should be an object with the following properties:

* `stream: Readable` - This is a [`stream.Readable`](https://nodejs.org/api/stream.html#class-streamreadable) object, which should pipe out the rendered content.
* `filepath: String` - The output file to write, relative to the output directory, e.g. if `output` is `./build` and you want `build/articles/how-to-drive/index.html` this would be `articles/how-to-drive/index.html`.

If no object is provided to the callback function (or no `stream` or `filepath` is provided) the file will be ignored and not written.

Ragu does not have an opinion about renderers, so you'll need to provide your own.

Here's an example that does not make use of streams functionality:

```js
// ragu.config.js
import { Writable } from 'node:stream'
import renderHtml from './your-own-renderer.js'
export default {
	// ... other stuff, then ...
	render: ({ filepath, stream, metadata, site }, callback) => {
		let content = ''
		stream.on('data', data => content += data)
		stream.on('end', () => {
			const html = renderHtml(content, metadata, site)
			const stream = new Writable()
			callback({
				stream,
				filepath: filepath.replace(/\.md$/, '/index.html'),
			})
			stream.write(html, () => {
				stream.destroy()
			})
		})
	},
}
```

#### 6. Finalize

After all files are written, an optional post-render function will be called if present.

```js
// ragu.config.js
export default {
	// ... other stuff, then ...
	finalize: async ({ files, site }) => {
		// copy other files, generate reports, etc.
	},
}
```

The function is optionally asynchronous, and is called with an object containing the following entries:

* `files: Object` - This is a map where the key is the original filepath, and the value is an object containing these entries:
	* `input: string` - The original filepath, relative to the configured `input` folder.
	* `output: string` - The output filepath, relative to the configured `output` folder.
	* `metadata: any` - The output of the frontmatter parser for this file, from Step 3.
* `site: any` - The output of the metadata merge, from Step 4.

## License

Published and released under the [Very Open License](http://veryopenlicense.com).

If you need a commercial license, [contact me here](https://davistobias.com/license?software=ragu).

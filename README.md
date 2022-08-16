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

If you want to use a pre-cooked recipe, try *ragù alla [bolognese](https://github.com/saibotsivad/bolognese)*:

```js
// ragu.config.js
import { config } from 'bolognese'
// re-export as default
export { config as default }
```

## CLI

You just run `ragu` to build, or `ragu [input] [output]` where the `[input]` is your content folder and `[output]` is where to put everything.

```bash
ragu /path/to/content /path/to/build
```

Your config file can define the `input` and `output` folders:

```bash
# if the config file is in the current directory
ragu # by itself
# if the file has a different name
ragu --config spicy.config.js # or -c
# if the config file is elsewhere
ragu -c /path/to/ragu.config.js
```

To rebuild files when they change, you'll use the `--watch` (or `-w`) flag.

> Note: As an optimization for the typical CI deployment flow, the file watching library is listed as an optional dependency, so you'll need to install it as a dev dependency: `npm install --save-dev chokidar`

```bash
# typical local development
ragu -w
```

Ragu doesn't have a server cooked in, but you can specify that in your config file.

In fact, most things are defined in the config file, so there aren't many CLI options.

## Processing Flow

Understanding how Ragu works will help you see how it might differ from similar software.

When in normal build mode, the following steps are followed and the process exits. In "watch" mode (e.g. with the `--watch` or `-w` flags) these steps run once at startup, and when files change the steps are run as needed.

### 1. Scan

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

### 2. Read File

The filtered files are read using a [read stream](https://nodejs.org/api/fs.html#fscreatereadstreampath-options) to extract and parse the frontmatter/metadata and content sections.

You don't need to provide a read function, by default Ragu will try to read files using the common triple dash separation for the frontmatter section, like this:

```md
---
title: My Cool Blog Post
published: true
---

Many wise words.
```

If you use the non-fenced version, or some other syntax, you'll need to provide a `read` function in your configuration. For example, if you are using [blockdown](https://github.com/saibotsivad/blockdown) syntax you might do this:

```js
// ragu.config.js
import { parse } from '@saibotsivad/blockdown'
export default {
	// ... other stuff, then ...
	read: ({ stream, filepath, callback }) => {
		let file = ''
		stream.on('data', data => { file += data })
		stream.on('end', () => {
			const { blocks } = parse(file)
			callback({
				frontmatter: blocks[0].content,
				// The `content` can be anything, a string or a list, or
				// whatever you want. It'll get passed as-is to the renderer in
				// later steps, which will need to understand the structure.
				// In this example, it is an array of objects.
				content: blocks.slice(1),
			})
		})
	},
}
```

The `read` function is called with an object containing the following properties:

* `callback: function` - The function to call when you've read the file enough, typically on the stream `end` event unless you can short-circuit and exit early.
* `filepath: string` - The filepath of the content file, relative to the input directory, e.g. if `input` were `./content` this might be `articles/how-to-drive.md`.
* `stream: ReadStream` - The NodeJS [read stream](https://nodejs.org/api/fs.html#fscreatereadstreampath-options) for the file.

When you're done reading the file, either because you've reached the end or detected that it's not a valid content file, call the `callback` function with an object containing these properties:

* `frontmatter: string` ***optional*** - The extracted string, exactly as you would pass it to the frontmatter parser.
* `content: any` ***optional*** - The extracted content, in any form. This property will be passed exactly as-is to the later render step.
* `ignore: boolean` ***optional*** - If this is set to `true`, this file will not be passed to later steps.

> Note: Be sure to call `stream.close()` if you can close the stream early, e.g. if you can detect that it is not a valid content file.

### 3. Parse Frontmatter

The frontmatter string is passed through a parser to become the per-file metadata object passed to later steps.

> Note: Ragu does not have an opinion on metadata parsers! If you don't provide one, it won't be called.

The most popular parser is probably [js-yaml](https://github.com/nodeca/js-yaml), which would look like this when configured (there are many options for parsing YAML):

```js
// ragu.config.js
import yaml from 'js-yaml'
export default {
	// ... other stuff, then ...
	parse: ({ frontmatter, filepath }) => {
		const metadata = yaml.load(string)
		// do some normalization here as needed
		return { metadata }
	},
}
```

The function is called with an object containing the following properties:

* `filepath: string` - The filepath of the content file, relative to the input directory, e.g. if `input` were `./content` this might be `articles/how-to-drive.md`.
* `frontmatter: string` - The extracted frontmatter section of the file, if successfully parsed.

This function is also where you might do some normalization of metadata properties. For example, it's common that the `published` property is either boolean or a date string. In the `parse` function you might normalize to boolean, based on the current date:

```js
// ragu.config.js
import yaml from 'js-yaml'
const now = Date.now()
export default {
	// ... other stuff, then ...
	parse: ({ frontmatter, filepath }) => {
		const metadata = yaml.load(string)
		metadata.published = metadata.published === true
			|| metadata.published.getTime() > now
		return { metadata }
	},
}
````

The function can also be asynchronous, and should return the following properties:

* `metadata: Any` - The metadata as parsed by your configured parser.
* `ignore: Boolean` *optional* - If set to true, the metadata will not be used in the next step.

### 4. Merge Site Metadata

After the frontmatter for all files is parsed, the resulting metadata for all files is passed to a merge function as a map of filename to metadata.

The output of this is passed to the render function in the next step, so here is where you would likely want to create things like collections, e.g. for "tags", "authors", and so on.

> Note: Ragu has no opinions baked in here: if you don't provide this function, the property given to the renderer will be `undefined`!

Here's an example of a merging function that you might be likely to use.

> Note: In this example, the `site.js` file is **not** a Ragu feature. Although it is a wise organizational strategy to move constant properties out to other files, Ragu **does not** auto-magically pull in data files, like you might see in `_data/site.yaml` for Jekyll or others.

```js
// site.js
export default {
	baseUrl: 'https://site.com',
}
// ragu.config.js
import sitewideProperties from './site.js'
export default {
	// ... other stuff, then ...
	merge: ({ filepathToMetadata }) => {
		const merged = {
			...sitewideProperties, // in this example, this adds `baseUrl`
			authors: new Set(),
			tags: new Set(),
			rss: []
		}
		for (const filename in filepathToMetadata) {
			const { author, tags, published } = filepathToMetadata[filename] || {}
			if (author) merged.authors.add(author)
			if (tags?.length) for (const tag of tags) merged.tags.add(tag)
			if (published) merged.rss.push(filename)
		}
		return merged
	},
}
```

The function is called with an object containing the following property:

* `filepathToMetadata: Object` - This is a map the key is each filepath (the path relative to the `input` folder) and the value is whatever came out of the `merge` function in Step 3.

The merging function can be `async`, for example if you need to do any pre-render setup work based on the merged metadata.

### 5. Render Content

After all metadata is merged, a render function is called for each file.

The function is called with an options object and an error-first callback function.

The options object contains the following properties:

* `content: any` - This is the exact property given from Step 2. If you are using normal Markdown, this would likely be the fully-realized `string` of the file, with the frontmatter/metadata section removed.
* `filepath: string` - The filepath of the content file, relative to the input directory, e.g. if `input` were `./content` this might be `articles/how-to-drive.md`.
* `metadata: any` - This is whatever comes out of the frontmatter parser in Step 3. (Note: that means if the output `metadata` property is `undefined`, this property will also be `undefined`!)
* `outputDirectory: string` - The absolute folder path of the output folder.
* `site: Any` - This is whatever comes out of your merging function in Step 4. (If you don't provide a merging function, this property will not be set.)

The error-first callback should be called with an error as the first property, if there is one, or an object with the following properties as the second property:

* `stream: Readable` - This is a [`stream.Readable`](https://nodejs.org/api/stream.html#class-streamreadable) object, which should pipe out the rendered content.
* `string: String` - If your output is small enough, you can pass it back on the `string` property instead.
* `filepath: String` - The output file to write, relative to the output directory, e.g. if `output` is `./build` and you want `build/articles/how-to-drive/index.html` this would be `articles/how-to-drive/index.html`. This property is given to the `finalize` function (in the next step) so even if you use Writable Streams you should return this.

If no object is provided to the callback function (or no `stream` or `filepath` is provided) the file will be ignored and not written.

> Note: Ragu does not have an opinion about renderers! You will need to provide your own.

Here's an example:

```js
// ragu.config.js
import renderHtml from './your-own-renderer.js'
export default {
	// ... other stuff, then ...
	render: ({ content, filepath, metadata, site }, callback) => {
		const html = renderHtml(content, metadata, site)
		callback(
			false, // error-first: there is no error
			{
				string: html,
				filepath: filepath.replace(/\.md$/, '/index.html'),
			},
		)
	},
}
```

Here is an example of using streams:

```js
// ragu.config.js
import { dirname, join } from 'node:path'
import renderHtmlStream from './your-own-streaming-renderer.js'
export default {
	// ... other stuff, then ...
	render: ({ outputDirectory, filepath, content, metadata, site }, callback) => {
		const htmlStream = renderHtmlStream(content, metadata, site)
		const relativeFilepath = filepath.replace(/\.md$/, '/index.html')
		const absoluteFilepath = join(outputDirectory, relativeFilepath)
		mkdir(dirname(absoluteFilepath), { recursive: true }, error => {
			if (error) return callback(error)
			const fileStream = createWriteStream(absoluteFilepath, { encoding: 'utf8' })
			callback(false, { stream: fileStream, filepath: relativeFilepath })
			htmlStream.pipe(fileStream)
		})
	},
```

### 6. Finalize

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

* `files: Object` - This is a map where the key is the original filepath relative to the `input` folder, and the value is an object containing these entries:
	* `output: string` - The output filepath, relative to the configured `output` folder.
	* `metadata: any` - The output of the frontmatter parser for this file, from Step 3.
* `site: any` - The output of the metadata merge, from Step 4.

## License

Published and released under the [Very Open License](http://veryopenlicense.com).

If you need a commercial license, [contact me here](https://davistobias.com/license?software=ragu).

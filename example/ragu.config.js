import { fileURLToPath } from 'node:url'
import { dirname, extname, join, sep } from 'node:path'
import { readFile } from 'node:fs/promises'
import { mkdir, createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'

import { parse } from '@saibotsivad/blockdown'
import yaml from 'js-yaml'
// This particular Markdown-to-HTML library is very lightweight
// and fast, but it is also... kind of limited.
import snarkdown from 'snarkdown'

const __dirname = dirname(fileURLToPath(import.meta.url))
const indexHtmlTemplate = await readFile(join(__dirname, './index.html'), 'utf8')

const sitewideProperties = {
	baseUrl: 'https://my-example-site.com/',
}

export default {
	input: './content',
	output: './public',
	filter: file => extname(file) === '.md',
	read: ({ filepath, stream, callback }) => {
		let file = ''
		stream.on('data', data => { file += data })
		stream.on('close', () => {
			const { blocks } = parse(file)
			callback(false, {
				frontmatter: blocks[0].content,
				content: blocks.slice(1),
			})
		})
		stream.on('error', error => {
			console.log('Read stream error for:', filepath, error)
		})
	},
	parse: ({ frontmatter, filepath }) => {
		if (!frontmatter) return { ignore: true }
		try {
			const metadata = yaml.load(frontmatter)
			if (typeof metadata?.published === 'string') metadata.published = new Date(metadata.published)
			return { metadata }
		} catch (error) {
			console.error('Could not load frontmatter YAML for:', filepath)
			if (process.env.DEBUG) console.debug('Error while reading YAML for ' + filepath, error)
			return { ignore: true }
		}
	},
	merge: ({ filepathToMetadata }) => {
		const merged = {
			...sitewideProperties, // in this example, this adds `baseUrl` here
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
	render: ({ outputDirectory, filepath, content, metadata, site }, callback) => {
		if (!metadata?.published) return callback()
		if (metadata.published.getTime && metadata.published.getTime() > Date.now()) return callback()

		// In this example, the `content` is output from Blockdown, which is
		// a list of sections. For this demo we'll only support Markdown, but
		// you could add support for MermaidJS or any number of things.

		let markdown = ''
		for (const { name, content: string } of content) {
			if (name === 'markdown') markdown += snarkdown(string)
		}

		const html = indexHtmlTemplate
			.replace(
				'{{title}}',
				metadata.title
					? `${metadata.title} - Ragu Example`
					: 'Ragu Example',
			)
			.replace(
				'{{content}}',
				markdown,
			)

		const relativeFilepath = filepath.endsWith('index.md')
			? 'index.html'
			: filepath.replace(/\.md$/, sep + 'index.html')
		if (metadata.stream_this_file) {
			// In this example there's no need to use a WriteStream, but if
			// you need it (big files or other stuff) you can do a callback
			// and specify a stream. Ragu will wait for the stream to end
			// before continuing.
			const absoluteFilepath = join(outputDirectory, relativeFilepath)

			mkdir(dirname(absoluteFilepath), { recursive: true }, error => {
				if (error) return callback(error)
				const stream = createWriteStream(absoluteFilepath, { encoding: 'utf8' })
				callback(false, { stream, filepath: relativeFilepath })
				stream.write(html, () => {
					stream.end()
				})
			})

		} else {
			// If you don't need the full power of a write stream, you can
			// just do this instead:
			callback(false, {
				string: html,
				filepath: relativeFilepath,
			})
		}
	},
	finalize: async ({ files, site }) => {
		// One potentially useful thing to do here is create some sort of report:
		let published = []
		let unpublished = []
		for (const filepath in files) {
			if (files[filepath].output) published.push(filepath)
			else unpublished.push(filepath)
		}
		console.log('Published:')
		for (const p of published) console.log('-', p)
		console.log('Not Published:')
		for (const p of unpublished) console.log('-', p)
		console.log('Unique Authors:')
		for (const a of site.authors) console.log('-', a)
		console.log('Unique Tags:')
		for (const t of site.tags) console.log('-', t)
	}
}

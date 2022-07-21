import sade from 'sade'

import { build } from './src/index.js'

sade('ragu [input] [output]', true)
	.version('1.0.0') // TODO
	.describe('Generate a folder of HTML from a folder of Markdown files.')
	.option('-c, --config', 'Filename of the configuration to load.', 'ragu.config.js')
	.option('-d, --domain', 'Override the "ragu.config.js" domain property. Defaults to "localhost:3000" if not set anywhere. If this contains "localhost" the links will be "http" instead of "https".')
	.option('-w, --watch', 'Rebuild on changes to anything in your site folder.')
	.action((input, output, opts) => {
		build(input, output, opts || {})
			.then(() => {
				console.log('Build complete!')
				process.exit(0)
			})
			.catch(error => {
				console.error(error)
				process.exit(1)
			})
	})
	.parse(process.argv)

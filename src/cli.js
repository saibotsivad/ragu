import sade from 'sade'

import { build } from './index.js'

const DEFAULT_CONFIG_FILE = 'ragu.config.js'

const version = '__VERSION__'

sade('ragu [input] [output]', true)
	.version(version)
	.describe('Generate a folder of HTML from a folder of Markdown files.')
	.example('-c ./content ./build # use config file but specify folders')
	.example('-c # config file specifies folders')
	.option('--config, -c', 'Filename of the configuration to load.', 'ragu.config.js')
	.action((input, output, opts) => {
		if (opts.port) opts.port = parseInt(opts.port, 3000)
		opts.input = input
		opts.output = output
		opts.cwd = process.cwd()
		if (!opts.config) opts.config = DEFAULT_CONFIG_FILE
		const start = Date.now()
		build(opts)
			.then(() => {
				console.log(`Build completed in ${Date.now() - start}ms.`)
				process.exit(0)
			})
			.catch(error => {
				if (error.name === 'RaguError') {
					if (error.details) console.error(error.title, error.details)
					else console.error(error.title)
				} else {
					console.error('Unexpected error during build:', error)
				}
				process.exit(1)
			})
	})
	.parse(process.argv)

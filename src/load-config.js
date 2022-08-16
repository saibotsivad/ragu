import { isAbsolute, dirname, basename, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { quit } from './ragu-error.js'
import { filter } from './default-filter.js'
import { read } from './default-read.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const noop = async () => { /* no-operation */ }

export const getImportableName = (cwd, file) => relative(__dirname, relative(cwd, file))

export const loadConfig = async ({ input, output, cwd, configFilename }) => import(getImportableName(cwd, configFilename))
	.then(
		imported => {
			if (!imported?.default) quit(`The config file doesn't have a default export: ${configFilename}`)
			return imported.default
		},
		error => {
			if (error.code === 'ERR_MODULE_NOT_FOUND' && error.message?.includes(basename(configFilename) + '\'')) quit(`Could not find the config file: ${configFilename}`)
			else throw error
		},
	)
	.then(config => {
		if (!config.filter) config.filter = filter
		if (!config.read) config.read = read

		if (!config.parse) config.parse = noop
		if (!config.merge) config.merge = noop

		if (!config.render) {
			config.render = noop
			console.warn('No render function found.')
		}

		if (!config.finalize) config.finalize = noop

		if (input) config.input = input
		if (output) config.output = output

		if (!config.input || !config.output) quit('Input and output folders must be specified as CLI parameters or in the config file.')

		const makeAbsolute = dir => isAbsolute(dir)
			? dir
			: join(cwd, dirname(configFilename), dir)
		config.input = makeAbsolute(config.input)
		config.output = makeAbsolute(config.output)

		return config
	})

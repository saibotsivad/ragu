import { join, isAbsolute } from 'node:path'
import timer from 'node:timers/promises'

import { createRenderer } from './noddity-renderer.js'
import { watchFiles } from './files-watcher.js'
import { buildFiles } from './files-builder.js'

const makeAbsolute = dir => isAbsolute(dir) ? dir : join(process.cwd(), dir)

const loadConfiguration = async (configName, filename) => import(filename)
	.then(i => {
		if (!i?.default) {
			console.error(`Loaded ${configName} config file but found no default export:`, filename)
			process.exit(1)
		}
		return i.default
	})
	.catch(error => {
		console.log(error)
		if (error.code === 'ERR_MODULE_NOT_FOUND') console.error(`Could not load ${configName} config file:`, filename)
		else console.error(error)
		process.exit(1)
	})

export const build = async (input, output, { config: configFilename, domain: configDomain, watch }) => {
	const raguConfig = await loadConfiguration('ragu', makeAbsolute(configFilename))
	if (typeof raguConfig.nonMarkdownRenderer !== 'function') console.warn('The ragu config needs to export a "nonMarkdownRenderer" function, to render non-markdown files.')

	const noddityConfig = await loadConfiguration('Noddity', join(makeAbsolute(input), 'config.js'))

	let pagePathPrefix = raguConfig.pagePathPrefix || noddityConfig.pagePathPrefix || 'post/'
	if (pagePathPrefix?.[0] !== '/') pagePathPrefix = '/' + pagePathPrefix

	let noddityRoot = raguConfig.noddityRoot || noddityConfig.noddityRoot || 'content/'
	noddityRoot = isAbsolute(noddityRoot) ? noddityRoot : makeAbsolute(join(input, noddityRoot))

	const hostname = configDomain || raguConfig.domain || 'localhost:3000'

	const render = createRenderer({
		noddityDirectory: noddityRoot,
		urlRenderer: async ({ link }) => `http${hostname.startsWith('localhost:') ? '' : 's'}//${hostname}${pagePathPrefix}${link}`,
		nonMarkdownRenderer: raguConfig.nonMarkdownRenderer,
		metadataParser: raguConfig.metadataParser,
		micromarkExtensions: raguConfig.micromarkExtensions,
		mdastExtensions: raguConfig.mdastExtensions,
	})

	let hasBuilt
	const emitter = watchFiles({ input: noddityRoot, render, noddityRoot })
	emitter.on('data', fileDetails => {
		buildFiles({ fileDetails, render, output: makeAbsolute(output) })
			.then(() => hasBuilt = true)
			.catch(error => {
				console.error('There was an error while building files.', error)
				if (!watch) process.exit(1)
			})
	})

	while (!hasBuilt || watch) {
		await timer.setTimeout(1)
	}

	// ============
	// console.log(await render.loadPost('services.md', 'post'))
}

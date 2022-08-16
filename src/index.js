import { join, relative, isAbsolute } from 'node:path'
import timer from 'node:timers/promises'

import { getImportableName, loadConfig } from './load-config.js'
import { scanDirectory } from './scan-directory.js'
import { readAllFilepaths, readOneFilepath } from './filepath-reader.js'
import { parseAll, parseOne } from './parse-frontmatter.js'
import { renderAllFilepaths, renderOneFilepath } from './filepath-renderer.js'

const makeAbsolute = dir => isAbsolute(dir) ? dir : join(process.cwd(), dir)

const buildFromLoadedConfig = async ({ config }) => {
	const filepaths = await scanDirectory({ absoluteDirectoryPath: config.input, filter: config.filter })
	const filepathToData = await readAllFilepaths({ reader: config.read, absoluteDirectoryPath: config.input, filepaths })
	const filepathToMetadata = await parseAll({ parser: config.parse, filepathToData })
	const siteData = await Promise.resolve(config.merge({ filepathToMetadata }))
	const filepathToOutputFilepath = await renderAllFilepaths({ absoluteDirectoryPath: config.output, renderer: config.render, siteData, filepathToData, filepathToMetadata, filepaths })
	const files = {
		// <filepath>: { output: <filepath>, metadata: <any> }
	}
	for (const filepath in filepathToOutputFilepath) files[filepath] = filepathToOutputFilepath[filepath]
	for (const filepath in filepathToMetadata) {
		if (!files[filepath]) files[filepath] = {}
		files[filepath].metadata = filepathToMetadata[filepath]
	}
	await config.finalize({ files, site: siteData })
}

export const build = async ({ input, output, cwd, config: configFilename }) => {
	const config = await loadConfig({ input, output, cwd, configFilename })
	return buildFromLoadedConfig({ config })
}

let fileWatcher
let building
let moreBuildRequested

const watchAndBuild = config => {
	if (fileWatcher) {}
	building = true
	const start = Date.now()
	buildFromLoadedConfig({ config })
		.then(
			() => console.log(`Build completed after ${Date.now() - start}ms.`),
			error => console.error('Error while building:', error),
		)
		.then(() => {
			building = false
			if (moreBuildRequested) watchAndBuild(config)
			moreBuildRequested = false
		})
}

let debounceTimer
let endTimer
const setupWatcherAndBuilder = config => {
	if (building) moreBuildRequested = true
	if (debounceTimer) clearTimeout(debounceTimer)
	debounceTimer = setTimeout(() => watchAndBuild(config), 300)
}

export const watch = async ({ input, output, cwd, config: configFilename }) => {
	const configWatchableFile = relative(cwd, configFilename)

	let configWasEverLoaded
	let timer
	const reload = () => {
		console.log(configWasEverLoaded ? 'Config file changed, rebuilding...' : 'Config file loaded, building...')
		configWasEverLoaded = true
		loadConfig({ input, output, cwd, configFilename })
			.then(
				setupWatcherAndBuilder,
				error => console.error('Error while loading config:', error),
			)
	}
	const debounceBuild = () => {
		if (timer) clearTimeout(timer)
		// enough time to import the config and start chokidar on the input folder
		timer = setTimeout(reload, 300)
	}

	return import('chokidar').then(
		({ watch }) => new Promise(() => {
			watch(configWatchableFile, { ignoreInitial: true })
				.on('change', debounceBuild)
				.on('error', error => console.error('Encountered an error while watching config file:', error))
				.on('ready', debounceBuild)
		}),
		error => {
			if (error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes("package 'chokidar' imported")) {
				console.error('The `chokidar` dependency cannot be found. This is an optional dependency, so you will need to install it as a dependency in your project.')
			} else {
				console.error(error)
			}
			process.exit(1)
		}
	)
}

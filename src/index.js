import { getImportableName, loadConfig } from './load-config.js'
import { scanDirectory } from './scan-directory.js'
import { readAllFilepaths, readOneFilepath } from './filepath-reader.js'
import { parseAll, parseOne } from './parse-frontmatter.js'
import { renderAllFilepaths, renderOneFilepath } from './filepath-renderer.js'

export {
	getImportableName,
	loadConfig,
	scanDirectory,
	readAllFilepaths,
	readOneFilepath,
	parseAll,
	parseOne,
	renderAllFilepaths,
	renderOneFilepath,
}

export const build = async ({ input, output, cwd, config: configFilename }) => {
	const config = await loadConfig({ input, output, cwd, configFilename })
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

import { dirname, join } from 'node:path'
import { mkdir, createWriteStream } from 'node:fs'

import promiseMap from 'p-map'

const writeFile = async ({ absoluteDirectoryPath, outputFilepath, string }) => new Promise((resolve, reject) => {
	const absoluteOutputFilepath = join(absoluteDirectoryPath, outputFilepath)
	mkdir(dirname(absoluteOutputFilepath), { recursive: true }, error => {
		if (error) return reject(error)
		const stream = createWriteStream(absoluteOutputFilepath, { encoding: 'utf8' })
		stream.write(string, () => {
			stream.end()
		})
		stream.on('close', resolve)
		stream.on('error', reject)
	})
})

export const renderOneFilepath = async ({ absoluteDirectoryPath, renderer, filepath, metadata, content, siteData }) => new Promise((resolve, reject) => {
	renderer({ content, outputDirectory: absoluteDirectoryPath, filepath, metadata, site: siteData }, (error, callbackOpts) => {
		if (error) return reject(error)
		if (!callbackOpts) return resolve()
		const { stream, filepath: outputFilepath, string } = callbackOpts
		if (stream) {
			stream.on('close', () => resolve(outputFilepath))
			stream.on('error', reject)
		} else {
			writeFile({ absoluteDirectoryPath, outputFilepath, string }, resolve, reject)
				.then(() => resolve(outputFilepath), reject)
		}
	})
})

export const renderAllFilepaths = async ({ absoluteDirectoryPath, renderer, siteData, filepathToData, filepathToMetadata, filepaths }) => {
	const results = await promiseMap(
		filepaths,
		filepath => renderOneFilepath({
			absoluteDirectoryPath,
			renderer,
			filepath,
			metadata: filepathToMetadata[filepath],
			content: filepathToData[filepath]?.content,
			siteData,
		}).then(outputFilepath => ({
			filepath,
			outputFilepath,
		})),
		{ concurrency: 100 },
	)
	const filepathToOutputFilepath = {}
	for (const { filepath, outputFilepath } of results) filepathToOutputFilepath[filepath] = { output: outputFilepath }
	return filepathToOutputFilepath
}

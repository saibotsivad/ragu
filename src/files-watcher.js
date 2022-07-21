import { relative, sep, join, isAbsolute } from 'node:path'
import { readFile } from 'node:fs/promises'
import EventEmitter from 'node:events'
import timer from 'node:timers/promises'

import chokidar from 'chokidar'

const makeAbsolute = dir => isAbsolute(dir) ? dir : join(process.cwd(), dir)

export const watchFiles = ({ input, render, noddityRoot }) => {
	const emitter = new EventEmitter()

	let chokidarReady
	let hasFinishedLoadingAtLeastOnce

	const absoluteFilepathToMetadataPromise = {}
	const ready = {}

	const remapAndEmitFiles = () => {
		Promise
			.all(Object.values(absoluteFilepathToMetadataPromise))
			.then(files => {
				emitter.emit('data', files)
			})
			.catch(error => {
				console.error('Unexpected error occurred while loading markdown files.', error)
				emitter.emit('data', false)
			})
	}

	const reloadFile = event => absoluteFilepath => {
		if (event === 'add' || event === 'change') {
			const extension = absoluteFilepath.split('.').pop()
			if (extension === 'md' && absoluteFilepath.startsWith(noddityRoot)) {
				const relativeFilepath = relative(noddityRoot, absoluteFilepath)
				absoluteFilepathToMetadataPromise[absoluteFilepath] = render
					.loadMetadata(relativeFilepath)
					.then(metadata => ({ relativeFilepath, metadata }))
			}
		} else if (event === 'unlink') delete absoluteFilepathToMetadataPromise[absoluteFilepath]
		if (chokidarReady) remapAndEmitFiles()
		return undefined
	}
	const fileWatcher = chokidar
		.watch(`${input}**/*.md`, { ignoreInitial: false })
		.on('add', reloadFile('add'))
		.on('change', reloadFile('change'))
		.on('unlink', reloadFile('unlink'))
		.on('error', error => console.error('Encountered an error while watching an input folder.', error))
		.on('ready', () => {
			chokidarReady = true
		})

	const checkIfReady = () => setTimeout(() => {
		if (!chokidarReady) {
			checkIfReady()
		} else {
			hasFinishedLoadingAtLeastOnce = true
			remapAndEmitFiles()
		}
	}, 1)
	checkIfReady()

	emitter.close = async () => fileWatcher.close()

	return emitter
}

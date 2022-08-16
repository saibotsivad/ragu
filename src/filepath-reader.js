import { join } from 'node:path'
import { createReadStream } from 'node:fs'

import promiseMap from 'p-map'

export const readOneFilepath = async ({ reader, absoluteDirectoryPath, filepath }) => new Promise(resolve => {
	reader({
		filepath,
		stream: createReadStream(join(absoluteDirectoryPath, filepath), { encoding: 'utf8' }),
		callback: (opts) => resolve({ ...(opts || {}), filepath }),
	})
})

export const readAllFilepaths = async ({ reader, absoluteDirectoryPath, filepaths }) => promiseMap(
	filepaths,
	filepath => readOneFilepath({ reader, absoluteDirectoryPath, filepath }),
	{ concurrency: 100 },
).then(results => {
	const map = {}
	for (const { filepath, frontmatter, content, ignore } of results) {
		if (!ignore && (frontmatter || content)) map[filepath] = { frontmatter, content }
	}
	return map
})

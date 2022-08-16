import { join } from 'node:path'
import { readdir } from 'node:fs/promises'

const readRelative = async (root, dir) => {
	const list = await readdir(join(root, dir || ''), { withFileTypes: true })
	const files = []
	const dirs = []
	for (const item of list) {
		if (item.isDirectory()) dirs.push(item.name)
		else files.push(item.name)
	}
	if (dirs.length) {
		const more = await Promise.all(dirs.map(d => readRelative(root, join(dir || '', d))))
		files.push(...more.flat())
	}
	return files.map(file => join(dir || '', file))
}

export const scanDirectory = async ({ absoluteDirectoryPath, filter: configFilter }) => readRelative(absoluteDirectoryPath)
	.then(files => files.filter(configFilter))

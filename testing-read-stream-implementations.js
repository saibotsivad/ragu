import { join } from 'node:path'
import { once } from 'node:events'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'


// The read-stream is created using a `highWaterMark` that is lower
// than the default. This is done so that only the frontmatter is
// read in, and not the entire file.
const FRONTMATTER_HIGHWATER_MARK = 300 // bytes

const onlyReadFrontmatterSection = async filepath => new Promise((resolve, reject) => {
	const stream = createReadStream(filepath, {
		encoding: 'utf8',
		highWaterMark: FRONTMATTER_HIGHWATER_MARK,
	})

	let started
	let ended
	let frontmatter = ''
	let end = 0
	let resolved

	stream.on('data', chunk => {
		if (ended) return
		const lines = chunk.split('\n') // be careful of \r\n
		let cursor = 0
		for (let line of lines) {
			let endsWithR = line.endsWith('\r')
			if (endsWithR) {
				cursor++
				line = line.slice(0, -1)
			}
			if (line === '---' && started) {
				cursor += 4 // `---` plus newline
				ended = true
				break
			} else if (line === '---') {
				cursor += 4 // `---` plus newline
				started = true
			} else if (started) {
				cursor += line.length
				frontmatter += line
				if (endsWithR) frontmatter += '\r'
				if (cursor !== (chunk.length - 1)) frontmatter += '\n'
			}
		}
		end += cursor
		if (ended) {
			resolved = true
			resolve({ frontmatter, end: end + 1 }) // trailing newline
			stream.close()
		}
	})

	const stop = () => {
		if (!resolved) {
			resolved = true
			if (!ended) resolve({}) // no valid frontmatter found
			else resolve({ frontmatter, end }) // frontmatter ended right on a chunk ending?
		}
	}
	stream.on('close', stop)
	stream.on('end', stop)

	stream.on('error', error => {
		resolved = true
		reject(error)
	})
})

const streamNonFrontmatterSection = (filepath, start) => createReadStream(filepath, {
	encoding: 'utf8',
	start,
})

const ingestStream = async stream => new Promise((resolve, reject) => {
	let chars = ''
	let resolved
	stream.on('data', d => chars += d)
	const stop = () => {
		if (!resolved) {
			resolved = true
			resolve(chars)
		}
	}
	stream.on('close', stop)
	stream.on('end', stop)
	stream.on('error', error => {
		resolved = true
		reject(error)
	})
})


const { frontmatter, end } = await onlyReadFrontmatterSection('./example/content/contribute.md')

const content = await ingestStream(streamNonFrontmatterSection('./example/content/contribute.md', end))

console.log({ frontmatter, content })


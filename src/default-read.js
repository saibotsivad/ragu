export const read = (stream, callback) => {
	let file = ''
	stream.on('data', data => { file += data })
	stream.on('end', () => {
		const lines = file.split(/\r?\n/)
		let frontmatter = []
		let content = []
		let frontmatterStarted
		let frontmatterFinished
		for (const line of lines) {
			if (line === '---' && !frontmatterStarted) {
				frontmatterStarted = true
			} else if (line === '---' && frontmatterStarted && !frontmatterFinished) {
				frontmatterFinished = true
			} else if (frontmatterFinished) {
				content.push(line)
			} else if (frontmatterStarted) {
				frontmatter.push(line)
			}
		}
		callback({
			frontmatter: frontmatter.join('\n'),
			content: content.join('\n'),
		})
	})
}

export const read = (stream, callback) => {
	let file = ''
	stream.on('data', data => { file += data })
	stream.on('end', () => {
		callback({
			frontmatter: 'TODO',
			content: file,
		})
	})
}

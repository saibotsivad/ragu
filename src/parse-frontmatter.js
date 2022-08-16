import promiseMap from 'p-map'

export const parseOne = async ({ parser, frontmatter, filepath }) => Promise
	.resolve(parser({ filepath, frontmatter }))
	.then(opts => opts || { ignore: true })

export const parseAll = async ({ parser, filepathToData }) => {
	const results = await promiseMap(
		Object
			.keys(filepathToData)
			.filter(filepath => filepathToData[filepath]?.frontmatter && !filepathToData[filepath]?.ignore),
		filepath => parseOne({ filepath, parser, frontmatter: filepathToData[filepath].frontmatter })
			.then(({ metadata, ignore }) => {
				if (!ignore) return { filepath, metadata }
			}),
		{ concurrency: 100 },
	)
	const map = {}
	for (const { filepath, metadata } of results.filter(Boolean)) map[filepath] = metadata
	return map
}

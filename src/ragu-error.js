class RaguError extends Error {}

export const quit = (title, details) => {
	const error = new RaguError()
	error.name = 'RaguError'
	error.title = title
	error.details = details
	throw error
}

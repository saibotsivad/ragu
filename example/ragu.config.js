import { frontmatter } from 'micromark-extension-frontmatter'
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter'
import { gfm } from 'micromark-extension-gfm'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { load, JSON_SCHEMA } from 'js-yaml'
import Ractive from 'ractive'

import sitewideProperties from './config.js'

Ractive.DEBUG = false

export default {
	input: './content', // TODO
	output: './build', // TODO
	micromarkExtensions: [
		frontmatter([ 'yaml' ]),
		gfm(),
	],
	mdastExtensions: [
		frontmatterFromMarkdown([ 'yaml' ]),
		gfmFromMarkdown(),
	],
	metadataParser: string => load(string, { schema: JSON_SCHEMA }),
	nonMarkdownRenderer: ({ filename, templateString, metadata, variables, innerHtml }) => {
		const data = {
			...sitewideProperties,
			filename,
		}
		;(variables || []).forEach((v, index) => {
			if (v.positional) data[index + 1] = v.name
			else data[v.name] = v.value
		})
		if (metadata) data.metadata = metadata
		return innerHtml
			? Ractive({ partials: { current: innerHtml }, template: templateString, data }).toHTML()
			: Ractive({ template: templateString, data }).toHTML()
	},
}

import { join } from 'node:path'
import { readFile } from 'node:fs/promises'

import { toHast } from 'mdast-util-to-hast'
import { toHtml } from 'hast-util-to-html'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { micromarkFromNoddity, mdastFromNoddity } from 'mdast-util-noddity'

import { noddityRenderer } from 'noddity-micromark-renderer'

export const createRenderer = ({
	noddityDirectory,
	micromarkExtensions,
	mdastExtensions,
	metadataParser,
	nonMarkdownRenderer,
	urlRenderer,
}) => noddityRenderer({
	loadFile: async file => readFile(join(noddityDirectory, file), 'utf8'),
	metadataParser,
	urlRenderer,
	nonMarkdownRenderer,
	markdownToMdast: string => fromMarkdown(string, {
		extensions: [
			...(micromarkExtensions || []),
			micromarkFromNoddity(),
		],
		mdastExtensions: [
			...(mdastExtensions || []),
			mdastFromNoddity(),
		],
	}),
	mdastToHast: mdastTree => toHast(mdastTree, { allowDangerousHtml: true }),
	hastToHtml: hastTree => toHtml(hastTree, { allowDangerousHtml: true }),
})

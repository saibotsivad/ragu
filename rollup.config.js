import { readFileSync } from 'node:fs'

import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'))

const plugins = [
	nodeResolve(),
	commonjs(),
	replace({
		preventAssignment: true,
		values: {
			__VERSION__: version
		}
	})
]

export default {
	input: 'src/cli.js',
	output: {
		file: 'dist/cli.js',
		format: 'es',
	},
	plugins,
}

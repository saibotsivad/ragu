import { extname } from 'node:path'

export const filter = file => extname(file) === '.md'

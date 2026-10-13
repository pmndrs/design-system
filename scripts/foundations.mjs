/**
 * Shared foundation values live in the editable `foundations.json` source.
 * Documentation and Figma tokens consume those values;
 * editorial headings, prose and examples never determine generated tokens.
 */
import { readFileSync } from 'node:fs'

/**
 * Read the canonical foundation values. A fresh read also lets a caller build
 * from an edited source without restarting its process.
 *
 * @param {URL} source - The structured foundation source to read.
 */
export function readFoundations(source = new URL('../foundations.json', import.meta.url)) {
  return JSON.parse(readFileSync(source, 'utf8'))
}

/**
 * Rewrite modern RGB functions into the comma-separated form accepted by
 * Tokens Studio.
 *
 * @param {string} css - CSS containing RGB colour functions.
 */
export const commaRgba = (css) => css.replace(/rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/g, 'rgba($1, $2, $3, $4)')

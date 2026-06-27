import fs from 'fs'
import path from 'path'

export type {
  TeamComparison,
  ComparisonData,
  GoldenBootEntry,
  EloMover,
  CleanSheet,
  GoalTimingBins,
  Upset,
  OppStrength,
  DescriptiveData,
  HistoricalPattern,
  ColorWinData,
  SmallestNation,
  FunFactsData,
  WCMatch,
} from './types'

function readJson<T>(filepath: string): T {
  return JSON.parse(fs.readFileSync(filepath, 'utf8')) as T
}

export function getComparisonData() {
  return readJson<import('./types').ComparisonData>(
    path.join(process.cwd(), 'output', 'comparison.json')
  )
}

export function getDescriptiveData() {
  return readJson<import('./types').DescriptiveData>(
    path.join(process.cwd(), 'output', 'descriptive.json')
  )
}

export function getFunFactsData() {
  return readJson<import('./types').FunFactsData>(
    path.join(process.cwd(), 'output', 'fun_facts.json')
  )
}

export function getWorldcupMatches(): import('./types').WCMatch[] {
  const data = readJson<{ matches: import('./types').WCMatch[] }>(
    path.join(process.cwd(), 'data', 'worldcup.json')
  )
  return data.matches
}

export function getSquadValues(): Record<string, number> {
  const outputPath = path.join(process.cwd(), 'output', 'squad_values.json')
  const dataPath = path.join(process.cwd(), 'data', 'squad_values.json')
  const filePath = fs.existsSync(outputPath) ? outputPath : dataPath
  return readJson<Record<string, number>>(filePath)
}

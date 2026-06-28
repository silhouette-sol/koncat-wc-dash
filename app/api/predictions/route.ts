import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  const filePath = path.join(process.cwd(), 'output', 'predictions.json')
  if (!fs.existsSync(filePath)) return NextResponse.json([])
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  return NextResponse.json(data)
}

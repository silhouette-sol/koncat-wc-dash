import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }
  const { term, context } = await req.json()
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const isBullets = term === 'matchday_bullets'

  const system = isBullets
    ? 'You summarize football matches as exactly 3 bullet points for people learning the sport. Each bullet is one sentence covering one key moment or result. Start each bullet with a team name or player name. Never use em dashes. No markdown bold. Plain text only. Return exactly 3 bullets separated by newline characters, each starting with the bullet character •'
    : 'You are a football education assistant for people learning the sport through data. For match summaries, write 3-4 engaging sentences covering the key results, standout scorers, and what it means for the tournament. For concept explanations, use 2-3 sentences with plain language and no jargon. Never use em dashes, use commas or periods instead.'

  const userMessage = isBullets
    ? `Summarize these matches as exactly 3 bullet points: ${context}`
    : `Explain ${term} in the context of: ${context}`

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system,
    messages: [{ role: 'user', content: userMessage }],
  })
  const explanation = (msg.content[0] as { text: string }).text
  return NextResponse.json({ explanation })
}

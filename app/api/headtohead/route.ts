import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }
  const { team1, team2, team1_prob, team2_prob } = await req.json()
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 120,
    system:
      'You explain head-to-head football probabilities to casual fans in 2 sentences. Sentence 1: what the numbers say. Sentence 2: one interesting reason why.',
    messages: [
      {
        role: 'user',
        content: `${team1} has a ${(team1_prob * 100).toFixed(1)}% chance to beat ${team2} (${(team2_prob * 100).toFixed(1)}%). Explain this.`,
      },
    ],
  })
  const analysis = (msg.content[0] as { text: string }).text
  return NextResponse.json({ analysis })
}

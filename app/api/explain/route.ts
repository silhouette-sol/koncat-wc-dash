import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }
  const { term, context } = await req.json()
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 150,
    system:
      'You are a football education assistant for people learning the sport through data. Explain concepts in 2-3 sentences maximum. Use plain language, no jargon. Give one real example from the 2026 World Cup where possible.',
    messages: [{ role: 'user', content: `Explain ${term} in the context of: ${context}` }],
  })
  const explanation = (msg.content[0] as { text: string }).text
  return NextResponse.json({ explanation })
}

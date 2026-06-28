import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

interface GoalEntry { name: string; minute: string }

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }
  const { match } = await req.json()
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const score = match.score?.ft ?? [0, 0]
  const matchDesc = `${match.team1} ${score[0]}-${score[1]} ${match.team2} on ${match.date}`
  const scorers = [
    ...(match.goals1 || []).map((g: GoalEntry) => `${g.name} (${match.team1}, ${g.minute}')`),
    ...(match.goals2 || []).map((g: GoalEntry) => `${g.name} (${match.team2}, ${g.minute}')`),
  ].join(', ')
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system:
      'You write 3-sentence match recaps for people learning football. Sentence 1: what happened (score, scorers, when). Sentence 2: one tactical observation. Sentence 3: what this means for that team\'s tournament path. Conversational tone.',
    messages: [
      {
        role: 'user',
        content: `Write a recap for: ${matchDesc}. Goal scorers: ${scorers || 'none recorded'}.`,
      },
    ],
  })
  const recap = (msg.content[0] as { text: string }).text
  return NextResponse.json({ recap })
}

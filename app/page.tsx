import {
  getComparisonData, getDescriptiveData, getFunFactsData,
  getWorldcupMatches, getSquadValues,
} from '@/lib/data'
import Header from '@/components/Header'
import DashboardTabs from '@/components/DashboardTabs'

export const dynamic = 'force-static'
export const revalidate = 3600

export default function Home() {
  const comparison = getComparisonData()
  const descriptive = getDescriptiveData()
  const funFacts = getFunFactsData()
  const worldcupMatches = getWorldcupMatches()
  const squadValues = getSquadValues()

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Header generatedAt={comparison.generated_at} />
        <DashboardTabs
          teams={comparison.teams}
          descriptive={descriptive}
          funFacts={funFacts}
          worldcupMatches={worldcupMatches}
          squadValues={squadValues}
          marketSource={comparison.market_source}
          generatedAt={comparison.generated_at}
        />
      </main>
      <footer>
        <div style={{ height: 1, backgroundColor: '#C9A027' }} />
        <div
          style={{
            backgroundColor: '#C9A027',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
          }}
        >
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#0B1D3A', fontWeight: 600 }}>
            Elo · Monte Carlo · Market
          </span>
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#0B1D3A', fontWeight: 600 }}>
            Built by kenni_bo · KONCAT Always Building
          </span>
        </div>
      </footer>
    </>
  )
}

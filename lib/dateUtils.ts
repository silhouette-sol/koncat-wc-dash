export function getPacificDateString(offsetDays = 0): string {
  const now = new Date()
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  if (offsetDays) pacificTime.setDate(pacificTime.getDate() + offsetDays)
  const year = pacificTime.getFullYear()
  const month = String(pacificTime.getMonth() + 1).padStart(2, '0')
  const day = String(pacificTime.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

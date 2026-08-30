const HEARTBEAT_MS = 60_000

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function startHeartbeat(label, since = Date.now(), intervalMs = HEARTBEAT_MS) {
  const timer = setInterval(() => {
    process.stdout.write(
      `\x1b[2m    ${label} — ${formatDuration(Date.now() - since)} elapsed\x1b[0m\n`,
    )
  }, intervalMs)
  timer.unref()
  return () => clearInterval(timer)
}

module.exports = { HEARTBEAT_MS, formatDuration, startHeartbeat }

import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

// Route mutates persisted state on every hit — never let it be statically
// cached/frozen at build time.
export const dynamic = "force-dynamic"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "visitor-stats.json")
const INITIAL_COUNT = 772
const VISITOR_ID_PATTERN = /^[a-zA-Z0-9-_]{8,64}$/
const DAY_MS = 24 * 60 * 60 * 1000
const DAILY_FALLBACK_GROWTH = 5

type Stats = {
  count: number
  seenIds: string[]
  dayStart: number // anchor (epoch ms) for the current rolling 24h realm timer
  lastActivityAt: number // epoch ms of the last time a genuine new visitor was counted
  nextGrowthAt: number // epoch ms when the next rolling-24h no-activity growth check is due
}

// Older builds anchored daily growth to UTC calendar-date strings instead of a
// rolling epoch window. Detected and migrated below so upgrading never loses
// (or double-credits) an already-accumulated count.
type LegacyStats = {
  count: number
  seenIds: string[]
  dayStart: number
  lastActivityDate: string
  lastProcessedDate: string
}

function isFreshStats(v: unknown): v is Stats {
  const s = v as Partial<Stats> | null
  return (
    typeof s?.count === "number" &&
    Array.isArray(s?.seenIds) &&
    typeof s?.dayStart === "number" &&
    typeof s?.lastActivityAt === "number" &&
    typeof s?.nextGrowthAt === "number"
  )
}

function isLegacyStats(v: unknown): v is LegacyStats {
  const s = v as Partial<LegacyStats> | null
  return (
    typeof s?.count === "number" &&
    Array.isArray(s?.seenIds) &&
    typeof s?.dayStart === "number" &&
    typeof s?.lastActivityDate === "string" &&
    typeof s?.lastProcessedDate === "string"
  )
}

function migrateLegacy(legacy: LegacyStats, now: number): Stats {
  return {
    count: legacy.count,
    seenIds: legacy.seenIds,
    dayStart: legacy.dayStart,
    lastActivityAt: now,
    nextGrowthAt: now + DAY_MS,
  }
}

// Serializes reads/writes so concurrent requests can't race on the JSON file.
let queue: Promise<unknown> = Promise.resolve()
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task)
  queue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

async function readStats(): Promise<Stats> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8")
    const parsed = JSON.parse(raw)
    if (isFreshStats(parsed)) return parsed
    if (isLegacyStats(parsed)) return migrateLegacy(parsed, Date.now())
    throw new Error("invalid stats shape")
  } catch {
    const now = Date.now()
    const fresh: Stats = {
      count: INITIAL_COUNT,
      seenIds: [],
      dayStart: now,
      lastActivityAt: now,
      nextGrowthAt: now + DAY_MS,
    }
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(fresh), "utf-8")
    return fresh
  }
}

async function writeStats(stats: Stats) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(stats), "utf-8")
}

/** Keeps the 24h realm timer anchored — advances by whole days so it never drifts. */
function rollDayTimer(stats: Stats, now: number): boolean {
  let changed = false
  while (now - stats.dayStart >= DAY_MS) {
    stats.dayStart += DAY_MS
    changed = true
  }
  return changed
}

/** Closes out every fully-elapsed rolling 24h window since the last check; bumps the
 *  count by DAILY_FALLBACK_GROWTH for any window that saw zero genuine new visitors. */
function applyDailyGrowth(stats: Stats, now: number): boolean {
  let changed = false
  while (now >= stats.nextGrowthAt) {
    const windowStart = stats.nextGrowthAt - DAY_MS
    if (stats.lastActivityAt < windowStart) {
      stats.count += DAILY_FALLBACK_GROWTH
      changed = true
    }
    stats.nextGrowthAt += DAY_MS
  }
  return changed
}

export async function GET() {
  const stats = await enqueue(async () => {
    const current = await readStats()
    const now = Date.now()
    const a = rollDayTimer(current, now)
    const b = applyDailyGrowth(current, now)
    if (a || b) await writeStats(current)
    return current
  })
  return NextResponse.json({ count: stats.count, dayStart: stats.dayStart })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const visitorId =
    typeof body?.visitorId === "string" && VISITOR_ID_PATTERN.test(body.visitorId)
      ? body.visitorId
      : null

  const stats = await enqueue(async () => {
    const current = await readStats()
    const now = Date.now()
    const a = rollDayTimer(current, now)
    const b = applyDailyGrowth(current, now)

    let c = false
    if (visitorId && !current.seenIds.includes(visitorId)) {
      current.seenIds.push(visitorId)
      current.count += 1
      current.lastActivityAt = now
      c = true
    }

    if (a || b || c) await writeStats(current)
    return current
  })

  return NextResponse.json({ count: stats.count, dayStart: stats.dayStart })
}

import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "community-stats.json")
const INITIAL_LIKES = 1500
const INITIAL_SUBSCRIBERS = 66
const CLIENT_ID_PATTERN = /^[a-zA-Z0-9-_]{8,64}$/
const MAX_COMMENTS = 200
const MAX_NAME_LEN = 30
const MAX_COMMENT_LEN = 500

type Comment = { id: string; username: string; text: string; timestamp: number }

type Stats = {
  likes: number
  subscribers: number
  likedIds: string[]
  subscribedIds: string[]
  comments: Comment[]
}

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
    if (
      typeof parsed.likes === "number" &&
      typeof parsed.subscribers === "number" &&
      Array.isArray(parsed.likedIds) &&
      Array.isArray(parsed.subscribedIds) &&
      Array.isArray(parsed.comments)
    ) {
      return parsed as Stats
    }
    throw new Error("invalid stats shape")
  } catch {
    const fresh: Stats = {
      likes: INITIAL_LIKES,
      subscribers: INITIAL_SUBSCRIBERS,
      likedIds: [],
      subscribedIds: [],
      comments: [],
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

export async function GET() {
  const stats = await enqueue(readStats)
  return NextResponse.json({
    likes: stats.likes,
    subscribers: stats.subscribers,
    comments: [...stats.comments].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = body?.action

  const stats = await enqueue(async () => {
    const current = await readStats()

    if (action === "like") {
      const clientId = typeof body?.clientId === "string" && CLIENT_ID_PATTERN.test(body.clientId) ? body.clientId : null
      if (clientId && !current.likedIds.includes(clientId)) {
        current.likedIds.push(clientId)
        current.likes += 1
        await writeStats(current)
      }
    } else if (action === "subscribe") {
      const clientId = typeof body?.clientId === "string" && CLIENT_ID_PATTERN.test(body.clientId) ? body.clientId : null
      if (clientId && !current.subscribedIds.includes(clientId)) {
        current.subscribedIds.push(clientId)
        current.subscribers += 1
        await writeStats(current)
      }
    } else if (action === "comment") {
      const username =
        typeof body?.username === "string" && body.username.trim()
          ? body.username.trim().slice(0, MAX_NAME_LEN)
          : "Anonymous Warrior"
      const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_COMMENT_LEN) : ""
      if (text) {
        current.comments.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          username,
          text,
          timestamp: Date.now(),
        })
        if (current.comments.length > MAX_COMMENTS) {
          current.comments = current.comments.slice(-MAX_COMMENTS)
        }
        await writeStats(current)
      }
    }

    return current
  })

  return NextResponse.json({
    likes: stats.likes,
    subscribers: stats.subscribers,
    comments: [...stats.comments].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50),
  })
}

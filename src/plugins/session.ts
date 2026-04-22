import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import type { Redis } from "ioredis";
import { config } from "../config.js";

// Implements the session store interface expected by @fastify/session.
class RedisSessionStore {
  private readonly prefix = "sess:";

  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number,
  ) {}

  get(
    sessionId: string,
    cb: (err: Error | null, session: Record<string, unknown> | null) => void,
  ): void {
    this.redis
      .get(`${this.prefix}${sessionId}`)
      .then((raw: string | null) =>
        cb(null, raw ? (JSON.parse(raw) as Record<string, unknown>) : null),
      )
      .catch((err: unknown) => cb(err as Error, null));
  }

  set(
    sessionId: string,
    session: Record<string, unknown>,
    cb: (err?: Error) => void,
  ): void {
    this.redis
      .setex(`${this.prefix}${sessionId}`, this.ttlSeconds, JSON.stringify(session))
      .then(() => cb())
      .catch((err: unknown) => cb(err as Error));
  }

  destroy(sessionId: string, cb: (err?: Error) => void): void {
    this.redis
      .del(`${this.prefix}${sessionId}`)
      .then(() => cb())
      .catch((err: unknown) => cb(err as Error));
  }
}

export default fp(async function sessionPlugin(app: FastifyInstance) {
  await app.register(fastifyCookie);

  await app.register(fastifySession, {
    secret: config.SESSION_SECRET,
    cookieName: "sid",
    cookie: {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: config.SESSION_TTL_SECONDS * 1000,
      path: "/",
    },
    store: new RedisSessionStore(app.redis, config.SESSION_TTL_SECONDS) as never,
    rolling: true,
    saveUninitialized: false,
  });
});

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { IncomingMessage } from 'http';
import type { WebSocket } from 'ws';
import { Server, OPEN, CLOSED, CLOSING } from 'ws';

type ManagedWebSocket = WebSocket & { _isAlive: boolean };

interface AuthenticatedIncomingMessage extends IncomingMessage {
  __userId?: string;
}

/** Max bytes buffered before we consider the connection stuck and terminate it. */
const BACKPRESSURE_LIMIT = 64 * 1024; // 64 KB

@Injectable()
export class WsGateway implements OnModuleInit, OnModuleDestroy {
  private wss: Server;
  private readonly clients = new Map<string, ManagedWebSocket>();
  private readonly logger = new Logger(WsGateway.name);
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const port = this.config.get<number>('WS_PORT', 3001);
    this.wss = new Server({
      port,
      maxPayload: 256 * 1024, // 256 KB — prevent oversized frames
      verifyClient: (info, done) => {
        // Reject immediately if no token, before upgrading to WS
        const url = new URL(info.req.url || '/', `http://${info.req.headers.host || 'localhost'}`);
        const token = url.searchParams.get('token');
        if (!token) {
          done(false, 401, 'Missing token');
          return;
        }
        try {
          const payload = this.jwt.verify<{ sub: string }>(token, {
            secret: this.config.get<string>('JWT_SECRET'),
          });
          // Attach userId to req for use in handleConnection
          (info.req as AuthenticatedIncomingMessage).__userId = payload.sub;
          done(true);
        } catch {
          done(false, 401, 'Invalid token');
        }
      },
    });

    this.wss.on('connection', (ws, req) =>
      this.handleConnection(ws as ManagedWebSocket, req as AuthenticatedIncomingMessage),
    );

    // Heartbeat: send ping every 30 s, terminate clients that didn't pong
    this.heartbeatTimer = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const mws = ws as ManagedWebSocket;
        if (mws._isAlive === false) {
          return ws.terminate();
        }
        mws._isAlive = false;
        ws.ping();
      });
    }, 30_000);

    // Periodic stale-connection sweep (catches edge cases heartbeat misses)
    this.cleanupTimer = setInterval(() => this.sweepStaleConnections(), 60_000);

    this.logger.log(`WebSocket server listening on port ${port}`);
  }

  onModuleDestroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    for (const ws of this.clients.values()) {
      ws.close(1001, 'server shutting down');
    }
    this.clients.clear();
    this.wss?.close();
  }

  private handleConnection(ws: ManagedWebSocket, req: AuthenticatedIncomingMessage): void {
    const userId = req.__userId!;

    // Mark alive for heartbeat
    ws._isAlive = true;
    ws.on('pong', () => {
      ws._isAlive = true;
    });

    // Close previous connection if the same user reconnects
    const existing = this.clients.get(userId);
    if (existing && existing.readyState === OPEN) {
      existing.close(1000, 'replaced by new connection');
    }

    this.clients.set(userId, ws);
    this.logger.debug(`Client connected: ${userId} (total: ${this.clients.size})`);

    ws.on('close', () => {
      if (this.clients.get(userId) === ws) {
        this.clients.delete(userId);
      }
      this.logger.debug(`Client disconnected: ${userId} (total: ${this.clients.size})`);
    });
  }

  /**
   * Send an event to a specific user.
   * Returns false if the user is not connected or the socket is congested.
   */
  sendToUser(userId: string, event: string, data: unknown): boolean {
    const ws = this.clients.get(userId);
    if (!ws || ws.readyState !== OPEN) {
      return false;
    }
    // Backpressure guard — don't grow the send buffer indefinitely
    if (ws.bufferedAmount > BACKPRESSURE_LIMIT) {
      this.logger.warn(`Dropping message to ${userId}: backpressure limit reached`);
      ws.terminate();
      return false;
    }
    ws.send(JSON.stringify({ event, data }));
    return true;
  }

  /** Remove entries whose underlying socket is closed/closing. */
  private sweepStaleConnections() {
    for (const [userId, ws] of this.clients) {
      if (ws.readyState === CLOSED || ws.readyState === CLOSING) {
        this.clients.delete(userId);
      }
    }
  }
}

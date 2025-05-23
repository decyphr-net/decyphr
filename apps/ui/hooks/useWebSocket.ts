import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface UseWebSocketProps<T> {
  clientId: string | null;
  serverUrl: string;
  events: {
    [event: string]: (message: T, socket: Socket) => void;
  };
}

// 🔁 Socket cache to reuse connections per server URL
const socketCache: Record<string, Socket> = {};
// 🧠 Tracks which rooms each client has joined
const joinedRooms: Record<string, Set<string>> = {};

/**
 * React hook for establishing and managing a Socket.IO WebSocket connection.
 *
 * Automatically joins the appropriate room based on clientId,
 * listens to specified events, and shares a cached socket per server.
 *
 * @template T - Type of the expected WebSocket message payload
 * @param {UseWebSocketProps<T>} props - Hook configuration
 * @returns {{
 *   data: T[];
 *   setData: React.Dispatch<React.SetStateAction<T[]>>;
 *   socket: Socket | null;
 * }}
 */
export const useWebSocket = <T>({ clientId, serverUrl, events }: UseWebSocketProps<T>) => {
  const [data, setData] = useState<T[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!clientId) return;

    let socket: Socket;

    // Use cached socket if available
    if (socketCache[serverUrl]) {
      socket = socketCache[serverUrl];
    } else {
      socket = io(serverUrl, {
        transports: ["websocket"],
        reconnectionAttempts: 5,
        timeout: 5000,
      });
      socketCache[serverUrl] = socket;
    }

    socketRef.current = socket;

    const roomKey = `${serverUrl}:${clientId}`;

    // Track joined rooms per server
    if (!joinedRooms[serverUrl]) {
      joinedRooms[serverUrl] = new Set();
    }

    socket.on("connect", () => {
      console.log(`🔗 Connected to ${serverUrl}`);

      if (!joinedRooms[serverUrl].has(clientId)) {
        socket.emit("joinRoom", clientId);
        socket.emit("fetchPage", clientId);
        socket.emit("fetchWordStatistics", clientId);
        joinedRooms[serverUrl].add(clientId);
      }
    });

    // Register all provided event handlers
    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, (message: T) => {
        console.log(`📨 [${event}]`, message);
        handler(message, socket);
      });
    });

    socket.on("connect_error", (err) => {
      console.error("❌ WebSocket connection error:", err);
    });

    socket.on("disconnect", (reason) => {
      console.warn("⚠️ WebSocket disconnected:", reason);
    });

    socket.onAny((event, ...args) => {
      console.log(`📩 [any event] ${event}`, ...args);
    });

    return () => {
      // Clean up listeners only (keep socket alive)
      Object.keys(events).forEach((event) => {
        socket.off(event);
      });
    };
  }, [clientId, serverUrl, events]);

  return {
    data,
    setData,
    socket: socketRef.current,
  };
};

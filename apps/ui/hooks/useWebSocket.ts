import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface UseWebSocketProps<T> {
  clientId: string | null;
  serverUrl: string;
  events: { [event: string]: (message: T, socket: Socket) => void };
}

export const useWebSocket = <T>({ clientId, serverUrl, events }: UseWebSocketProps<T>) => {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    if (!clientId) return;

    const socket = io(serverUrl, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      timeout: 5000,
    });

    socket.on("connect", () => {
      console.log(`🔗 Connected to ${serverUrl}`);
      socket.emit("joinRoom", clientId);
      socket.emit("fetchPage", clientId);
      socket.emit("fetchWordStatistics", clientId);
    });

    // Dynamically attach event listeners
    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, (message: T) => {
        console.log(`📩 Received ${event}:`, message);
        handler(message, socket);
      });
    });

    socket.on("connect_error", (err) => {
      console.error("❌ WebSocket connect error:", err);
    });

    socket.on("disconnect", (reason) => {
      console.warn("⚠️ Disconnected from WebSocket:", reason);
    });

    socket.onAny((event, ...args) => {
      console.log(`📩 Received WebSocket Event: ${event}`, args);
    });


    return () => {
      socket.disconnect();
    };
  }, [clientId, serverUrl, events]);

  return { data, setData };
};

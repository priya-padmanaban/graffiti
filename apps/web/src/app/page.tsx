"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserId } from "@/lib/storage";

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to default room
    router.push("/r/global");
  }, [router]);

  return null;
  const [userId] = useState(() => getUserId());
  const [ws, setWs] = useState<DrawingWebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [credits, setCredits] = useState(0);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(10);
  const [opacity, setOpacity] = useState(1);
  const [showRules, setShowRules] = useState(false);

  // Initialize WebSocket
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3002";
    const websocket = new DrawingWebSocket(wsUrl);

    websocket.connect().then(() => {
      setConnected(true);
      setWs(websocket);

      // Join room
      websocket.send({
        type: "join",
        roomId,
        userId,
      });

      // Listen for messages
      websocket.onMessage((message: ServerMessage) => {
        if (message.type === "init") {
          setCredits(message.credits);
        } else if (message.type === "credits_update") {
          setCredits(message.credits);
        } else if (message.type === "error") {
          console.error("Server error:", message.message);
        }
      });
    });

    return () => {
      websocket.disconnect();
    };
  }, [roomId, userId]);


  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Graffiti - {roomId}</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Credits:</span>
            <span className="font-semibold">{credits}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
              title={connected ? "Connected" : "Disconnected"}
            />
            <span className="text-sm text-gray-600">{connected ? "Connected" : "Disconnected"}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Color picker */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Color:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
            />
          </div>

          {/* Brush size */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Size:</label>
            <input
              type="range"
              min="1"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-gray-600 w-8">{brushSize}</span>
          </div>

          {/* Opacity */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Opacity:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-gray-600 w-8">{Math.round(opacity * 100)}%</span>
          </div>

          {/* Rules button */}
          <button
            onClick={() => setShowRules(true)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Rules
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        {ws && (
          <Canvas
            roomId={roomId}
            userId={userId}
            ws={ws}
            onCreditsUpdate={setCredits}
            color={color}
            brushSize={brushSize}
            opacity={opacity}
          />
        )}
      </div>

      {/* Rules modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}


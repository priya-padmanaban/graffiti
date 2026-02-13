"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Canvas from "@/components/Canvas";
import RulesModal from "@/components/RulesModal";
import { DrawingWebSocket } from "@/lib/websocket";
import { getUserId } from "@/lib/storage";
import { ServerMessage } from "@graffiti/shared";

export default function RoomPage() {
  const params = useParams();
  const roomId = (params.roomId as string) || "global";
  const [userId] = useState(() => getUserId());
  const [ws, setWs] = useState<DrawingWebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [credits, setCredits] = useState(0);
  const [infiniteCredits, setInfiniteCredits] = useState(false);
  const [cheatCode, setCheatCode] = useState("");
  const [showCheatInput, setShowCheatInput] = useState(false);
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
          setInfiniteCredits(message.infiniteCredits || false);
        } else if (message.type === "credits_update") {
          setCredits(message.credits);
          setInfiniteCredits(message.infiniteCredits || false);
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
          <h1 className="text-xl font-bold">graffiti - {roomId}</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Credits:</span>
            <span className="font-semibold">{infiniteCredits ? "∞" : credits}</span>
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
            onCreditsUpdate={(credits, infiniteCredits) => {
              setCredits(credits);
              if (infiniteCredits !== undefined) {
                setInfiniteCredits(infiniteCredits);
              }
            }}
            color={color}
            brushSize={brushSize}
            opacity={opacity}
            credits={credits}
            infiniteCredits={infiniteCredits}
          />
        )}
      </div>

      {/* Rules modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Cheat code input - bottom right */}
      <div className="fixed bottom-4 right-4 z-50">
        {showCheatInput ? (
          <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 flex gap-2">
            <input
              type="text"
              placeholder="Enter code"
              value={cheatCode}
              onChange={(e) => setCheatCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && ws && cheatCode.trim()) {
                  ws.send({
                    type: "cheat_code",
                    code: cheatCode.trim(),
                  });
                  setCheatCode("");
                  setShowCheatInput(false);
                } else if (e.key === "Escape") {
                  setShowCheatInput(false);
                  setCheatCode("");
                }
              }}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={() => {
                if (ws && cheatCode.trim()) {
                  ws.send({
                    type: "cheat_code",
                    code: cheatCode.trim(),
                  });
                  setCheatCode("");
                }
                setShowCheatInput(false);
              }}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Submit
            </button>
            <button
              onClick={() => {
                setShowCheatInput(false);
                setCheatCode("");
              }}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCheatInput(true)}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg shadow"
            title="Enter cheat code"
          >
            ENTER A CODE
          </button>
        )}
      </div>
    </div>
  );
}


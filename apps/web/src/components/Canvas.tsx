"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { DrawingWebSocket } from "@/lib/websocket";
import { Point, StrokeChunk, StrokeChunkWithId, DRAWING_CONSTANTS, DRAWING_CONSTANTS as CONSTANTS, CREDIT_CONSTANTS } from "@graffiti/shared";

interface CanvasProps {
  roomId: string;
  userId: string;
  ws: DrawingWebSocket;
  onCreditsUpdate: (credits: number, infiniteCredits?: boolean) => void;
  color: string;
  brushSize: number;
  opacity: number;
  credits: number;
  infiniteCredits: boolean;
}

export default function Canvas({ roomId, userId, ws, onCreditsUpdate, color, brushSize, opacity, credits, infiniteCredits }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Batching state
  const batchRef = useRef<Point[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentStrokeRef = useRef<{ color: string; size: number; opacity: number } | null>(null);

  // Calculate scale and offset to fit canvas
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const scaleX = containerWidth / DRAWING_CONSTANTS.CANVAS_WIDTH;
      const scaleY = containerHeight / DRAWING_CONSTANTS.CANVAS_HEIGHT;
      const newScale = Math.min(scaleX, scaleY);

      setScale(newScale);
      setOffset({
        x: (containerWidth - DRAWING_CONSTANTS.CANVAS_WIDTH * newScale) / 2,
        y: (containerHeight - DRAWING_CONSTANTS.CANVAS_HEIGHT * newScale) / 2,
      });
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Setup canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = DRAWING_CONSTANTS.CANVAS_WIDTH;
    canvas.height = DRAWING_CONSTANTS.CANVAS_HEIGHT;

    // Set default drawing style
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, DRAWING_CONSTANTS.CANVAS_WIDTH, DRAWING_CONSTANTS.CANVAS_HEIGHT);
  }, []);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Point | null => {
      if (!containerRef.current) return null;

      const rect = containerRef.current.getBoundingClientRect();
      const x = (screenX - rect.left - offset.x) / scale;
      const y = (screenY - rect.top - offset.y) / scale;

      if (x < 0 || x > DRAWING_CONSTANTS.CANVAS_WIDTH || y < 0 || y > DRAWING_CONSTANTS.CANVAS_HEIGHT) {
        return null;
      }

      return { x, y };
    },
    [offset, scale]
  );

  // Send batched points
  const sendBatch = useCallback(() => {
    if (batchRef.current.length === 0 || !currentStrokeRef.current) return;

    // Check if we have enough credits (client-side check)
    const cost = batchRef.current.length * CREDIT_CONSTANTS.COST_PER_POINT;
    if (!infiniteCredits && credits < cost) {
      // Not enough credits, stop drawing
      setIsDrawing(false);
      currentStrokeRef.current = null;
      batchRef.current = [];
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }
      return;
    }

    const chunk: StrokeChunk = {
      points: [...batchRef.current],
      color: currentStrokeRef.current.color,
      size: currentStrokeRef.current.size,
      opacity: currentStrokeRef.current.opacity,
      roomId,
    };

    ws.send({
      type: "stroke_chunk",
      chunk,
    });

    batchRef.current = [];
  }, [ws, roomId, credits, infiniteCredits]);

  // Draw a point on the canvas
  const drawPoint = useCallback(
    (point: Point, color: string, size: number, opacity: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    },
    []
  );

  // Draw a stroke (line of points)
  const drawStroke = useCallback(
    (points: Point[], color: string, size: number, opacity: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (points.length === 0) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = opacity;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      ctx.stroke();
      ctx.globalAlpha = 1.0;
    },
    []
  );

  // Handle drawing start
  const handleStart = useCallback(
    (x: number, y: number) => {
      // Check if we have credits before starting to draw
      if (!infiniteCredits && credits < CREDIT_CONSTANTS.COST_PER_POINT) {
        return; // Not enough credits to draw even one point
      }

      const point = screenToCanvas(x, y);
      if (!point) return;

      setIsDrawing(true);
      currentStrokeRef.current = { color, size: brushSize, opacity };

      drawPoint(point, color, brushSize, opacity);
      batchRef.current = [point];

      // Clear any pending batch timer
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
    },
    [screenToCanvas, drawPoint, color, brushSize, opacity, credits, infiniteCredits]
  );

  // Handle drawing move
  const handleMove = useCallback(
    (x: number, y: number) => {
      if (!isDrawing || !currentStrokeRef.current) return;

      // Check if we still have credits during drawing
      if (!infiniteCredits && credits < CREDIT_CONSTANTS.COST_PER_POINT) {
        // Ran out of credits, stop drawing
        setIsDrawing(false);
        currentStrokeRef.current = null;
        batchRef.current = [];
        if (batchTimerRef.current) {
          clearTimeout(batchTimerRef.current);
          batchTimerRef.current = null;
        }
        return;
      }

      const point = screenToCanvas(x, y);
      if (!point) return;

      const lastPoint = batchRef.current[batchRef.current.length - 1];
      if (lastPoint) {
        drawStroke([lastPoint, point], currentStrokeRef.current.color, currentStrokeRef.current.size, currentStrokeRef.current.opacity);
      }

      batchRef.current.push(point);

      // Send batch if it reaches max size
      if (batchRef.current.length >= CONSTANTS.MAX_POINTS_PER_CHUNK) {
        sendBatch();
      } else if (!batchTimerRef.current) {
        // Schedule batch send
        batchTimerRef.current = setTimeout(() => {
          sendBatch();
          batchTimerRef.current = null;
        }, CONSTANTS.BATCH_INTERVAL_MS);
      }
    },
    [isDrawing, screenToCanvas, drawStroke, sendBatch, credits, infiniteCredits]
  );

  // Handle drawing end
  const handleEnd = useCallback(() => {
    if (!isDrawing) return;

    setIsDrawing(false);

    // Send any remaining points
    if (batchRef.current.length > 0) {
      sendBatch();
    }

    // Clear batch timer
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }

    currentStrokeRef.current = null;
  }, [isDrawing, sendBatch]);

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      handleStart(e.clientX, e.clientY);
    },
    [handleStart]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      handleMove(e.clientX, e.clientY);
    },
    [handleMove]
  );

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    },
    [handleStart]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    },
    [handleMove]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      handleEnd();
    },
    [handleEnd]
  );

  // Listen for WebSocket messages to draw remote strokes and handle errors
  useEffect(() => {
    const unsubscribe = ws.onMessage((message) => {
      if (message.type === "stroke_chunk_broadcast") {
        const chunk = message.chunk;
        drawStroke(chunk.points as Point[], chunk.color, chunk.size, chunk.opacity);
      } else if (message.type === "error") {
        // If server says insufficient credits, stop drawing
        if (message.message === "Insufficient credits" || message.message.includes("credits")) {
          setIsDrawing(false);
          currentStrokeRef.current = null;
          batchRef.current = [];
          if (batchTimerRef.current) {
            clearTimeout(batchTimerRef.current);
            batchTimerRef.current = null;
          }
        }
      }
    });

    return unsubscribe;
  }, [ws, drawStroke]);

  // Load snapshot and replay strokes
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${apiUrl}/api/rooms/${roomId}/state?userId=${userId}`);
        const data = await response.json();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Load snapshot if available
        if (data.snapshotUrl && data.snapshotUrl.startsWith("http")) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.src = data.snapshotUrl;
        }

        // Replay strokes since snapshot
        if (data.strokesSinceSnapshot) {
          for (const stroke of data.strokesSinceSnapshot as StrokeChunkWithId[]) {
            drawStroke(stroke.points as Point[], stroke.color, stroke.size, stroke.opacity);
          }
        }

        // Update credits
        if (data.credits !== undefined) {
          onCreditsUpdate(data.credits, data.infiniteCredits);
        }
      } catch (error) {
        console.error("Error loading initial state:", error);
      }
    };

    loadInitialState();
  }, [roomId, userId, onCreditsUpdate, drawStroke]);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-gray-100">
      <canvas
        ref={canvasRef}
        className="absolute"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "top left",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
}


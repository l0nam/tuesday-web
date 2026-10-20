"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { Button } from "../ui/button";
import { PauseIcon, PlayIcon } from "@phosphor-icons/react/dist/ssr";
import type { SkinViewer as SkinViewerInstance } from "skinview3d";

type SkinViewerProps = {
  username: string;
  className?: string;
};

export function SkinViewer({ username, className = "" }: SkinViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewerInstance | null>(null);

  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const nickname = username.trim();

    if (!/^[a-zA-Z0-9_]{3,16}$/.test(nickname)) {
      return;
    }

    let disposed = false;
    let viewer: import("skinview3d").SkinViewer | null = null;
    let resizeObserver: ResizeObserver | null = null;

    async function initViewer() {
      try {
        const { SkinViewer, IdleAnimation } = await import("skinview3d");

        if (disposed || !canvasRef.current || !containerRef.current) {
          return;
        }

        const rect = containerRef.current.getBoundingClientRect();

        const skinViewer = new SkinViewer({
          canvas: canvasRef.current,
          width: Math.max(1, Math.floor(rect.width)),
          height: Math.max(1, Math.floor(rect.height)),
          skin: `/api/minecraft/skin/${encodeURIComponent(nickname)}`,
        });

        viewer = skinViewer;
        viewerRef.current = skinViewer;

        const animation = new IdleAnimation();
        animation.speed = 0.6;
        skinViewer.animation = animation;
        skinViewer.autoRotate = true;

        skinViewer.controls.enableRotate = true;
        skinViewer.controls.enableZoom = true;
        skinViewer.controls.enablePan = false;

        skinViewer.zoom = 0.8;

        skinViewer.renderer.setClearColor(0x000000, 0);

        resizeObserver = new ResizeObserver(() => {
          if (!containerRef.current || !viewer) return;

          const { width, height } =
            containerRef.current.getBoundingClientRect();

          viewer.width = Math.max(1, Math.floor(width));
          viewer.height = Math.max(1, Math.floor(height));
        });

        resizeObserver.observe(containerRef.current);
      } catch (error) {
        if (!disposed) {
          console.error("Не удалось создать SkinViewer:", error);
        }
      }
    }

    void initViewer();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      viewer?.dispose();
      viewerRef.current = null;
      viewer = null;
    };
  }, [username]);

  return (
    <div
      className={cn(
        "relative h-115 w-full overflow-hidden",
        "rounded-xl ring ring-foreground/10 bg-card",
        className,
      )}
      ref={containerRef}
    >
      <Button
        variant="secondary"
        size="icon"
        className="absolute right-5 top-5"
        onClick={() => {
          const viewer = viewerRef.current;
          if (!viewer) return;
          const nextPaused = !paused;
          viewer.autoRotate = !nextPaused;
          setPaused(nextPaused);
        }}
      >
        {paused ? <PlayIcon weight="bold" /> : <PauseIcon weight="bold" />}
      </Button>

      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}

import { useEffect, useRef } from "react";

const SCISSOR_W = 320;
const SCISSOR_H = 220;
const LERP = 0.10;

export function ScissorBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.src = "/logo.png";

    let raf;
    let mouse = { x: -9999, y: -9999 };
    let current = { x: -9999, y: -9999 };
    let entered = false;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function onMouseMove(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (!entered) entered = true;
    }
    function onMouseLeave() {
      entered = false;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    function draw() {
      const { width, height } = canvas;

      // Lerp scissor position toward mouse
      if (entered) {
        current.x += (mouse.x - current.x) * LERP;
        current.y += (mouse.y - current.y) * LERP;
      } else if (current.x === -9999) {
        current.x = width / 2;
        current.y = height / 2;
      }

      // Dark base
      ctx.fillStyle = "#0a0c10";
      ctx.fillRect(0, 0, width, height);

      if (img.complete && img.naturalWidth > 0 && entered) {
        const sx = current.x - SCISSOR_W / 2;
        const sy = current.y - SCISSOR_H / 2;

        // Scale logo to cover full canvas
        const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight) * 0.9;
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        const dx = (width - dw) / 2;
        const dy = (height - dh) / 2;

        // Clip to scissor rect and draw logo
        ctx.save();
        ctx.beginPath();
        ctx.rect(sx, sy, SCISSOR_W, SCISSOR_H);
        ctx.clip();
        ctx.globalAlpha = 0.85;
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
        ctx.restore();

        // Scissor border
        ctx.strokeStyle = "rgba(59, 130, 246, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sx + 0.75, sy + 0.75, SCISSOR_W - 1.5, SCISSOR_H - 1.5);

        // Corner accents
        const cs = 10;
        ctx.strokeStyle = "rgba(59, 130, 246, 1)";
        ctx.lineWidth = 2;
        const corners = [
          [sx, sy, cs, 0, 0, cs],
          [sx + SCISSOR_W, sy, -cs, 0, 0, cs],
          [sx, sy + SCISSOR_H, cs, 0, 0, -cs],
          [sx + SCISSOR_W, sy + SCISSOR_H, -cs, 0, 0, -cs],
        ];
        for (const [x, y, hx, hy, vx, vy] of corners) {
          ctx.beginPath();
          ctx.moveTo(x + hx, y + hy);
          ctx.lineTo(x, y);
          ctx.lineTo(x + vx, y + vy);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(draw);
    }

    img.onload = () => { raf = requestAnimationFrame(draw); };
    if (img.complete) raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

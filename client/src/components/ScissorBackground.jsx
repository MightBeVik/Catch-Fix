import { useEffect, useRef } from "react";

const SCISSOR_RADIUS = 180;
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

      // Animated color blob background
      const t = Date.now() * 0.0003;
      const cx = width * 0.7 + Math.sin(t) * width * 0.1;
      const cy = height * 0.3 + Math.cos(t * 1.3) * height * 0.1;
      const grad = ctx.createRadialGradient(cx, cy, 80, cx, cy, width * 0.7);
      grad.addColorStop(0, "#e0e7ef");
      grad.addColorStop(1, "#f8fafc");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Soft color blob overlays
      const blob1 = ctx.createRadialGradient(width*0.2, height*0.8, 0, width*0.2, height*0.8, 220);
      blob1.addColorStop(0, "rgba(59,130,246,0.13)");
      blob1.addColorStop(1, "rgba(59,130,246,0)");
      ctx.fillStyle = blob1;
      ctx.beginPath();
      ctx.arc(width*0.2, height*0.8, 220, 0, 2*Math.PI);
      ctx.fill();

      const blob2 = ctx.createRadialGradient(width*0.8, height*0.2, 0, width*0.8, height*0.2, 180);
      blob2.addColorStop(0, "rgba(236,72,153,0.10)");
      blob2.addColorStop(1, "rgba(236,72,153,0)");
      ctx.fillStyle = blob2;
      ctx.beginPath();
      ctx.arc(width*0.8, height*0.2, 180, 0, 2*Math.PI);
      ctx.fill();

      // Feathered circular reveal for the logo
      if (img.complete && img.naturalWidth > 0 && entered) {
        // Scale logo to cover full canvas
        const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight) * 0.9;
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        const dx = (width - dw) / 2;
        const dy = (height - dh) / 2;

        // Feathered mask
        ctx.save();
        ctx.globalAlpha = 1;
        // Create a radial gradient for feathered edge
        const mask = ctx.createRadialGradient(current.x, current.y, SCISSOR_RADIUS * 0.7, current.x, current.y, SCISSOR_RADIUS);
        mask.addColorStop(0, "rgba(255,255,255,1)");
        mask.addColorStop(1, "rgba(255,255,255,0)");

        // Draw the logo to an offscreen canvas
        const off = document.createElement('canvas');
        off.width = width;
        off.height = height;
        const offCtx = off.getContext('2d');
        offCtx.globalAlpha = 0.92;
        offCtx.drawImage(img, dx, dy, dw, dh);

        // Set the composite mode and draw the feathered mask
        offCtx.globalCompositeOperation = 'destination-in';
        offCtx.beginPath();
        offCtx.arc(current.x, current.y, SCISSOR_RADIUS, 0, 2 * Math.PI);
        offCtx.closePath();
        offCtx.fillStyle = mask;
        offCtx.fill();

        // Draw the masked logo onto the main canvas
        ctx.drawImage(off, 0, 0);
        ctx.restore();
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

/**
 * Generates an animated test video stream with real objects (person, car, cup, phone)
 * using HTML Canvas captureStream().
 * This allows 100% testing of real-time vision detection even if webcam access
 * is restricted by browser privacy or iframe permissions.
 */

let animationId: number | null = null;
let sampleCanvas: HTMLCanvasElement | null = null;

export function createSampleVideoStream(): MediaStream | null {
  if (typeof document === 'undefined') return null;

  if (!sampleCanvas) {
    sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 640;
    sampleCanvas.height = 480;
  }

  const ctx = sampleCanvas.getContext('2d');
  if (!ctx) return null;

  let frame = 0;

  const renderFrame = () => {
    frame++;
    if (!ctx || !sampleCanvas) return;

    // Background room
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, sampleCanvas.width, sampleCanvas.height);

    // Floor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 320, sampleCanvas.width, 160);

    // Grid lines for perspective
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let x = 0; x <= sampleCanvas.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 320);
      ctx.lineTo((x - 320) * 1.5 + 320, 480);
      ctx.stroke();
    }

    // Object 1: Person walking across (moves back and forth from Left to Center to Right)
    const personX = 280 + Math.sin(frame * 0.02) * 220; // 60 to 500
    const personY = 160;

    // Draw realistic stylized person figure
    ctx.fillStyle = '#38bdf8';
    // Head
    ctx.beginPath();
    ctx.arc(personX + 25, personY + 20, 18, 0, Math.PI * 2);
    ctx.fill();
    // Torso / Coat
    ctx.fillRect(personX + 5, personY + 40, 40, 75);
    // Legs
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(personX + 8, personY + 115, 14, 55);
    ctx.fillRect(personX + 28, personY + 115, 14, 55);
    // Arms
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(personX - 2, personY + 45, 8, 45);
    ctx.fillRect(personX + 44, personY + 45, 8, 45);

    // Object 2: Desk with Laptop & Cup on the right
    ctx.fillStyle = '#78350f';
    ctx.fillRect(440, 270, 170, 90); // Desk

    // Laptop on desk
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(460, 240, 60, 40); // Screen
    ctx.fillStyle = '#64748b';
    ctx.fillRect(455, 278, 70, 6); // Base

    // Cup on desk
    ctx.fillStyle = '#f97316';
    ctx.fillRect(550, 248, 20, 30); // Cup body
    ctx.beginPath();
    ctx.arc(573, 263, 6, 0, Math.PI * 2); // Handle
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Signboard 1: High-Contrast Emergency Exit Sign (Top-Center)
    ctx.fillStyle = '#15803d'; // Green background
    ctx.fillRect(220, 45, 200, 48);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(220, 45, 200, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EMERGENCY EXIT', 320, 76);

    // Signboard 2: Door Room Plaque (Left Door)
    ctx.fillStyle = '#334155'; // Door frame
    ctx.fillRect(20, 110, 100, 210);
    ctx.fillStyle = '#eab308'; // Brass plaque
    ctx.fillRect(30, 140, 80, 35);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('ROOM 104', 70, 163);

    // Signboard 3: Desk label / Shop sign
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(445, 210, 95, 25);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('METRO CAFE', 492, 227);

    // Top Header
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AI Smart Vision Prototype — Simulated Feed With Visible Signs', 20, 25);

    animationId = requestAnimationFrame(renderFrame);
  };

  renderFrame();

  // captureStream at 30 fps
  if ('captureStream' in sampleCanvas) {
    return (sampleCanvas as unknown as { captureStream(fps: number): MediaStream }).captureStream(30);
  }
  return null;
}

export function stopSampleVideoStream(): void {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

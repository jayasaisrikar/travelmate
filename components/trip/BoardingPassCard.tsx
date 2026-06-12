'use client';

/**
 * Boarding-pass share card — renders a trip as a crisp static PNG styled like an
 * airline boarding pass (replaces the old animated globe GIF). The modal preview
 * shows this exact image, so what you see is what gets shared/downloaded.
 */

const W = 1000;
const H = 420;
const SCALE = 2; // retina export
const STUB_X = 712;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) lines[maxLines - 1] = fit(ctx, [lines[maxLines - 1]].join(' '), maxWidth);
  return lines.slice(0, maxLines);
}

function code(seed: string, len: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i += 1) {
    h = (h * 1103515245 + 12345) >>> 0;
    out += alpha[h % alpha.length];
  }
  return out;
}

function iata(destination: string) {
  const letters = (destination || 'TRIP').toUpperCase().replace(/[^A-Z]/g, '');
  return (letters.slice(0, 3) || 'TRP').padEnd(3, 'X');
}

function drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  // simple right-pointing paper plane
  ctx.moveTo(0, -size * 0.55);
  ctx.lineTo(size, 0);
  ctx.lineTo(0, size * 0.55);
  ctx.lineTo(size * 0.32, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const s = 40;
  ctx.save();
  ctx.translate(x, y);
  // sunset gradient tile
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0, '#fbbf24');
  g.addColorStop(0.55, '#ea580c');
  g.addColorStop(1, '#f43f5e');
  ctx.fillStyle = g;
  roundRect(ctx, 0, 0, s, s, 12);
  ctx.fill();
  // two waves
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(9, 17);
  ctx.quadraticCurveTo(17, 8, 22, 12);
  ctx.quadraticCurveTo(29, 18, 31, 9);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(9, 25);
  ctx.quadraticCurveTo(17, 16, 22, 20);
  ctx.quadraticCurveTo(29, 26, 31, 17);
  ctx.stroke();
  ctx.restore();
}

function drawBoardingPass(
  ctx: CanvasRenderingContext2D,
  { destination, shareText, shareUrl }: { destination: string; shareText: string; shareUrl: string }
) {
  const dest = destination || 'Your trip';
  const ref = code(shareUrl || dest, 6);
  const seat = `${(ref.charCodeAt(0) % 30) + 1}${'ABCDEF'[ref.charCodeAt(1) % 6]}`;

  ctx.clearRect(0, 0, W, H);

  // card base
  ctx.save();
  ctx.shadowColor = 'rgba(58,37,64,0.18)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 14;
  roundRect(ctx, 16, 16, W - 32, H - 32, 26);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  // stub background (warm cream)
  ctx.save();
  roundRect(ctx, 16, 16, W - 32, H - 32, 26);
  ctx.clip();
  const stubGrad = ctx.createLinearGradient(STUB_X, 0, W, H);
  stubGrad.addColorStop(0, '#fff7ed');
  stubGrad.addColorStop(1, '#ffe4e6');
  ctx.fillStyle = stubGrad;
  ctx.fillRect(STUB_X, 0, W - STUB_X, H);
  // top accent ribbon on main body
  const ribbon = ctx.createLinearGradient(16, 0, STUB_X, 0);
  ribbon.addColorStop(0, '#fbbf24');
  ribbon.addColorStop(0.55, '#ea580c');
  ribbon.addColorStop(1, '#f43f5e');
  ctx.fillStyle = ribbon;
  ctx.fillRect(16, 16, STUB_X - 16, 8);
  ctx.restore();

  // ---- main body ----
  drawLogo(ctx, 44, 50);
  ctx.fillStyle = '#3a2540';
  ctx.font = '800 26px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('way', 98, 78);
  ctx.fillStyle = '#ea580c';
  ctx.fillText('flo', 145, 78);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#8c7882';
  ctx.font = '800 13px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('B O A R D I N G   P A S S', STUB_X - 36, 70);
  ctx.textAlign = 'left';

  // route: FROM -> TO
  const routeY = 150;
  ctx.fillStyle = '#9b8b92';
  ctx.font = '700 12px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('FROM', 44, routeY - 24);
  ctx.fillStyle = '#3a2540';
  ctx.font = '900 40px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('HOME', 44, routeY + 14);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#9b8b92';
  ctx.font = '700 12px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('TO', STUB_X - 36, routeY - 24);
  ctx.fillStyle = '#ea580c';
  ctx.font = '900 40px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(iata(dest), STUB_X - 36, routeY + 14);
  ctx.textAlign = 'left';

  // dashed flight path with plane
  const lineY = routeY + 2;
  ctx.strokeStyle = '#fed7aa';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.moveTo(176, lineY);
  ctx.lineTo(STUB_X - 150, lineY);
  ctx.stroke();
  ctx.setLineDash([]);
  drawPlane(ctx, (176 + STUB_X - 150) / 2, lineY, 16, '#ea580c');

  // destination line
  ctx.fillStyle = '#9b8b92';
  ctx.font = '700 12px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('DESTINATION', 44, 224);
  ctx.fillStyle = '#3a2540';
  ctx.font = '800 30px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(fit(ctx, dest, STUB_X - 100), 44, 256);

  // field grid
  const fields: Array<[string, string]> = [
    ['PASSENGER', 'Wayflo traveler'],
    ['BOARDS', 'Anytime'],
    ['REF', ref],
  ];
  fields.forEach(([label, value], i) => {
    const fx = 44 + i * 210;
    ctx.fillStyle = '#9b8b92';
    ctx.font = '700 11px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(label, fx, 300);
    ctx.fillStyle = '#3a2540';
    ctx.font = '800 17px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(fit(ctx, value, 190), fx, 322);
  });

  // tagline + url
  ctx.fillStyle = '#7c6a72';
  ctx.font = '600 14px "Plus Jakarta Sans", Arial, sans-serif';
  wrap(ctx, shareText, STUB_X - 90, 2).forEach((l, i) => ctx.fillText(l, 44, 358 + i * 20));

  // ---- stub ----
  const sx = STUB_X + 24;
  ctx.fillStyle = '#9b8b92';
  ctx.font = '700 11px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('SEAT', sx, 70);
  ctx.fillStyle = '#3a2540';
  ctx.font = '900 34px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(seat, sx, 104);

  ctx.fillStyle = '#9b8b92';
  ctx.font = '700 11px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('DESTINATION', sx, 150);
  ctx.fillStyle = '#ea580c';
  ctx.font = '900 30px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(iata(dest), sx, 182);

  // barcode
  const barTop = 214;
  const barBottom = 318;
  let bx = sx;
  let n = 0;
  const seed = ref + dest;
  while (bx < W - 40) {
    const w = 1 + (seed.charCodeAt(n % seed.length) % 4);
    if (n % 2 === 0) {
      ctx.fillStyle = '#3a2540';
      ctx.fillRect(bx, barTop, w, barBottom - barTop);
    }
    bx += w + 1;
    n += 1;
  }

  ctx.fillStyle = '#9b8b92';
  ctx.font = '700 10px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(fit(ctx, (shareUrl || 'wayflo').replace(/^https?:\/\//, ''), W - sx - 36), sx, 348);
  ctx.fillStyle = '#ea580c';
  ctx.font = '800 11px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('SCAN TO VIEW TRIP', sx, 372);

  // perforation: dashed line + punched notches
  ctx.strokeStyle = '#eaddc7';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 7]);
  ctx.beginPath();
  ctx.moveTo(STUB_X, 40);
  ctx.lineTo(STUB_X, H - 40);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(STUB_X, 16, 16, 0, Math.PI * 2);
  ctx.arc(STUB_X, H - 16, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export async function createBoardingPassFile({
  destination,
  shareText,
  shareUrl,
}: {
  destination: string;
  shareText: string;
  shareUrl: string;
}): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to render boarding pass.');
  ctx.scale(SCALE, SCALE);
  drawBoardingPass(ctx, { destination, shareText, shareUrl });

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  );
  const slug = destination ? destination.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'trip';
  return new File([blob], `wayflo-${slug || 'trip'}-pass.png`, { type: 'image/png' });
}

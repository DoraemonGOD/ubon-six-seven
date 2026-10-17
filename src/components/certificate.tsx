// Volunteer certificate. The designed artwork (public/cert/template.jpg, with
// the sample name, reference and date removed) is drawn on a canvas and the
// real name, reference number and issue date are written in the same places,
// sizes and colours as the original design.
import { Download, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import nameThai from "@fontsource/sarabun/files/sarabun-thai-600-italic.woff2?url";
import nameLatin from "@fontsource/sarabun/files/sarabun-latin-600-italic.woff2?url";
import smallThai from "@fontsource/sarabun/files/sarabun-thai-500-normal.woff2?url";
import smallLatin from "@fontsource/sarabun/files/sarabun-latin-500-normal.woff2?url";
import type { Certificate } from "@/lib/model";

const TEMPLATE = "/cert/template.jpg";
const W = 1536;
const H = 1024;
/** Draw at twice the artwork size so the text stays sharp when printed. */
const SCALE = 2;

// Positions measured on the original design (artwork pixels).
const NAME = { cx: 772, baseline: 457, maxWidth: 560, size: 62, color: "rgb(12, 55, 115)" };
const REF = { x: 1157, baseline: 874, size: 17, color: "rgb(37, 64, 128)" };
const DATE = { x: 1157, baseline: 937, size: 17, color: "rgb(42, 68, 128)" };
const FAMILY = "CertSarabun";

let fontsReady: Promise<void> | null = null;
function loadFonts() {
  fontsReady ??= (async () => {
    const faces = [
      new FontFace(FAMILY, `url(${nameThai})`, { style: "italic", weight: "600", unicodeRange: "U+0E01-0E5B, U+200C-200D, U+25CC" }),
      new FontFace(FAMILY, `url(${nameLatin})`, { style: "italic", weight: "600" }),
      new FontFace(FAMILY, `url(${smallThai})`, { style: "normal", weight: "500", unicodeRange: "U+0E01-0E5B, U+200C-200D, U+25CC" }),
      new FontFace(FAMILY, `url(${smallLatin})`, { style: "normal", weight: "500" }),
    ];
    await Promise.all(faces.map(async (face) => document.fonts.add(await face.load())));
  })().catch((err) => {
    fontsReady = null;
    throw err;
  });
  return fontsReady;
}

let artwork: Promise<HTMLImageElement> | null = null;
function loadArtwork() {
  artwork ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      artwork = null;
      reject(new Error("certificate artwork failed to load"));
    };
    img.src = TEMPLATE;
  });
  return artwork;
}

/** "18 ต.ค. 2569", the same style as the sample date on the design. */
export function thaiDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
}

export async function drawCertificate(canvas: HTMLCanvasElement, cert: Pick<Certificate, "name" | "ref" | "issuedAt">) {
  const [img] = await Promise.all([loadArtwork(), loadFonts()]);
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, W, H);

  // Name: centred, shrunk only if it is longer than the line allows.
  let size = NAME.size;
  ctx.font = `italic 600 ${size}px ${FAMILY}`;
  const wide = ctx.measureText(cert.name).width;
  if (wide > NAME.maxWidth) {
    size = Math.max(36, Math.floor((size * NAME.maxWidth) / wide));
    ctx.font = `italic 600 ${size}px ${FAMILY}`;
  }
  ctx.fillStyle = NAME.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(cert.name, NAME.cx, NAME.baseline);

  ctx.textAlign = "left";
  ctx.font = `500 ${REF.size}px ${FAMILY}`;
  ctx.fillStyle = REF.color;
  ctx.fillText(cert.ref, REF.x, REF.baseline);
  ctx.font = `500 ${DATE.size}px ${FAMILY}`;
  ctx.fillStyle = DATE.color;
  ctx.fillText(thaiDate(cert.issuedAt), DATE.x, DATE.baseline);
}

function fileName(cert: Pick<Certificate, "ref">) {
  return `เกียรติบัตร-${cert.ref}.png`;
}

/** Shows the finished certificate with download and print buttons. */
export function CertificateView({ cert }: { cert: Pick<Certificate, "name" | "ref" | "issuedAt"> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"drawing" | "ready" | "failed">("drawing");

  useEffect(() => {
    if (!canvas.current) return;
    setState("drawing");
    drawCertificate(canvas.current, cert)
      .then(() => setState("ready"))
      .catch(() => setState("failed"));
  }, [cert.name, cert.ref, cert.issuedAt]);

  function download() {
    canvas.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName(cert);
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, "image/png");
  }

  function print() {
    const data = canvas.current?.toDataURL("image/png");
    if (!data) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${cert.ref}</title>` +
        `<style>@page{size:A4 landscape;margin:0}html,body{margin:0;height:100%}body{display:grid;place-items:center}img{width:100%;height:auto}</style>` +
        `</head><body><img src="${data}" onload="setTimeout(()=>window.print(),200)"></body></html>`,
    );
    win.document.close();
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-line">
        <canvas ref={canvas} className="block h-auto w-full" style={{ aspectRatio: `${W} / ${H}` }} aria-label={`เกียรติบัตรของ ${cert.name}`} />
        {state !== "ready" ? (
          <div className="absolute inset-0 grid place-items-center bg-surface text-sm text-muted">
            {state === "failed" ? "โหลดเกียรติบัตรไม่ได้ ลองรีเฟรชหน้า" : "กำลังสร้างเกียรติบัตร…"}
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={state !== "ready"}
          onClick={download}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue text-sm font-semibold text-surface shadow-sm disabled:opacity-50"
        >
          <Download className="size-4" /> ดาวน์โหลดรูป
        </button>
        <button
          type="button"
          disabled={state !== "ready"}
          onClick={print}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-line bg-surface text-sm font-semibold text-ink disabled:opacity-50"
        >
          <Printer className="size-4" /> พิมพ์ / PDF
        </button>
      </div>
    </div>
  );
}

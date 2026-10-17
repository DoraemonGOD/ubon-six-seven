// Photos: take or pick one (shrunk on the phone before sending), and show a
// saved one later. Lists only know a photo exists; the picture loads on demand.
import { Camera, ImageIcon, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getOpsPhoto } from "@/lib/ops/fns";

/** Shrinks a photo to at most 1280 px and JPEG quality 0.7 so it sends fast on a weak signal. */
export function compressPhoto(file: File, max = 1280, quality = 0.7) {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}

export function PhotoField({
  value,
  onChange,
  hint,
}: {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  hint?: string;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      let data = await compressPhoto(file);
      if (data.length > 600_000) data = await compressPhoto(file, 960, 0.6);
      if (data.length > 900_000) {
        toast("รูปใหญ่เกินไป ลองรูปอื่น หรือส่งโดยไม่มีรูปก็ได้");
        return;
      }
      onChange(data);
    } catch {
      toast("เปิดรูปนี้ไม่ได้ ลองรูปอื่น");
    } finally {
      setBusy(false);
      if (camera.current) camera.current.value = "";
      if (gallery.current) gallery.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="fade-in relative overflow-hidden rounded-xl border border-line">
          <img src={value} alt="รูปที่จะส่ง" className="max-h-64 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-navy/80 px-3 py-1.5 text-xs font-semibold text-surface"
          >
            <X className="size-3.5" /> เอารูปออก
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => camera.current?.click()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm font-semibold transition active:scale-[0.98]"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} ถ่ายรูป
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => gallery.current?.click()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm font-semibold transition active:scale-[0.98]"
          >
            <ImageIcon className="size-4" /> เลือกจากเครื่อง
          </button>
        </div>
      )}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} />
    </div>
  );
}

const cache = new Map<string, string | null>();

/** A saved photo on a request or report, fetched when shown (permission checked on the server). */
export function RecordPhoto({ kind, id, alt, className }: { kind: "request" | "report"; id: string; alt: string; className?: string }) {
  const key = `${kind}:${id}`;
  const [src, setSrc] = useState<string | null | undefined>(cache.get(key));
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (cache.has(key)) return;
    let alive = true;
    void getOpsPhoto({ data: { kind, id } })
      .then((r) => {
        cache.set(key, r.photo);
        if (alive) setSrc(r.photo);
      })
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [key, kind, id]);

  if (src === undefined) {
    return <div className={`${className ?? ""} grid min-h-32 place-items-center rounded-xl bg-bg text-xs text-muted`}>กำลังโหลดรูป…</div>;
  }
  if (!src) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full" aria-label="ดูรูปเต็ม">
        <img src={src} alt={alt} className={className ?? "max-h-56 w-full rounded-xl object-cover"} />
      </button>
      {open ? (
        <div className="fade-in fixed inset-0 z-[80] grid place-items-center bg-navy/90 p-4" onClick={() => setOpen(false)}>
          <img src={src} alt={alt} className="max-h-full max-w-full rounded-xl" />
          <button type="button" className="absolute top-4 right-4 rounded-full bg-white/15 p-2 text-surface" aria-label="ปิด">
            <X className="size-5" />
          </button>
        </div>
      ) : null}
    </>
  );
}

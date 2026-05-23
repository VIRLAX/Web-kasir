import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { X, Camera, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BarcodeScannerProps {
  open: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
  title?: string;
}

export function BarcodeScanner({ open, onScan, onClose, title = "Scan Barcode" }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannedRef = useRef(false);
  const mountedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const cleanup = useCallback(() => {
    try { readerRef.current?.reset(); } catch (_) {}
    readerRef.current = null;
  }, []);

  const startScanner = useCallback(async () => {
    if (!videoRef.current || !mountedRef.current) return;
    scannedRef.current = false;
    setStatus("loading");
    setErrorMsg("");

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // Listen for video playing event — most reliable "ready" signal on Android
      const video = videoRef.current;
      const onPlaying = () => {
        if (mountedRef.current) setStatus("ready");
      };
      video.addEventListener("playing", onPlaying, { once: true });
      // Fallback: force ready after 4s even if playing event doesn't fire
      const readyTimer = setTimeout(() => {
        if (mountedRef.current) setStatus("ready");
      }, 4000);

      // Let ZXing handle getUserMedia — use decodeFromConstraints for better mobile compat
      await reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        video,
        (result, err, controls) => {
          if (!mountedRef.current) {
            controls?.stop();
            return;
          }
          if (result && !scannedRef.current) {
            scannedRef.current = true;
            controls?.stop();
            clearTimeout(readyTimer);
            const code = result.getText();
            onScan(code);
            onClose();
          }
          // Suppress expected NotFoundException spam (no barcode in frame)
          void err;
        }
      );

      clearTimeout(readyTimer);
      // decodeFromConstraints resolves when video stream is set up
      if (mountedRef.current) setStatus("ready");
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      cleanup();
      const msg = String(err);
      if (msg.includes("NotAllowed") || msg.includes("Permission") || msg.includes("denied")) {
        setErrorMsg("Izin kamera ditolak.\n\nBuka Pengaturan browser lalu izinkan akses Kamera untuk situs ini, kemudian coba lagi.");
      } else if (msg.includes("NotFound") || msg.includes("NotReadable")) {
        setErrorMsg("Kamera tidak dapat diakses. Pastikan kamera tidak dipakai aplikasi lain.");
      } else if (msg.includes("OverconstrainedError")) {
        // Retry without facingMode constraint
        retryWithAnyCamera();
        return;
      } else {
        setErrorMsg(`Gagal membuka kamera.\n\n${msg}`);
      }
      setStatus("error");
    }
  }, [onScan, onClose, cleanup]);

  const retryWithAnyCamera = useCallback(async () => {
    if (!videoRef.current || !mountedRef.current) return;
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      await reader.decodeFromConstraints(
        { video: true },
        videoRef.current,
        (result, _err, controls) => {
          if (!mountedRef.current) { controls?.stop(); return; }
          if (result && !scannedRef.current) {
            scannedRef.current = true;
            controls?.stop();
            onScan(result.getText());
            onClose();
          }
        }
      );
      if (mountedRef.current) setStatus("ready");
    } catch (err) {
      if (!mountedRef.current) return;
      cleanup();
      setErrorMsg("Tidak dapat membuka kamera apa pun di perangkat ini.");
      setStatus("error");
    }
  }, [onScan, onClose, cleanup]);

  useEffect(() => {
    mountedRef.current = open;
    if (open) {
      startScanner();
    } else {
      cleanup();
      setStatus("loading");
    }
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [open]);

  const handleClose = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0 [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{title}</span>
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-black w-full" style={{ aspectRatio: "4/3" }}>
          {/* Video always rendered so ref is available */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
            style={{ display: status === "error" ? "none" : "block" }}
          />

          {/* Scan frame — shown when ready */}
          {status === "ready" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-44">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-primary" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-primary" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-primary" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-primary" />
                <div
                  className="absolute left-1 right-1 h-0.5 bg-primary/80 rounded"
                  style={{ animation: "scan 2s ease-in-out infinite" }}
                />
              </div>
              <style>{`
                @keyframes scan {
                  0%   { top: 8px;  opacity: 0.5; }
                  50%  { top: calc(100% - 8px); opacity: 1; }
                  100% { top: 8px;  opacity: 0.5; }
                }
              `}</style>
            </div>
          )}

          {/* Loading overlay */}
          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-white">Membuka kamera...</p>
              <p className="text-xs text-white/50 px-6 text-center">Izinkan akses kamera jika ada permintaan</p>
            </div>
          )}

          {/* Error overlay */}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-zinc-950">
              <AlertCircle className="w-12 h-12 text-destructive flex-shrink-0" />
              <p className="text-sm text-white leading-relaxed whitespace-pre-line">{errorMsg}</p>
              <Button size="sm" variant="outline" onClick={startScanner} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Coba Lagi
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-card border-t border-border">
          <p className="text-xs text-muted-foreground text-center mb-3">
            {status === "ready" ? "Arahkan kamera ke barcode produk" : "Menunggu kamera..."}
          </p>
          <Button variant="outline" className="w-full" onClick={handleClose}>
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

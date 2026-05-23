import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { X, Camera, Loader2, AlertCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BarcodeScannerProps {
  open: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
  title?: string;
}

type Phase = "permission" | "loading" | "ready" | "error";

export function BarcodeScanner({ open, onScan, onClose, title = "Scan Barcode" }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannedRef = useRef(false);
  const mountedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("permission");
  const [errorMsg, setErrorMsg] = useState("");

  const cleanup = useCallback(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (readerRef.current as any)?.reset?.();
    } catch (_) {}
    readerRef.current = null;
  }, []);

  const startScanner = useCallback(async () => {
    if (!videoRef.current || !mountedRef.current) return;
    scannedRef.current = false;
    setPhase("loading");
    setErrorMsg("");

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const video = videoRef.current;

      // Transition to ready as soon as video has data
      const onCanPlay = () => {
        if (mountedRef.current) setPhase("ready");
      };
      video.addEventListener("canplay", onCanPlay, { once: true });
      video.addEventListener("playing", onCanPlay, { once: true });

      // Fallback: force ready after 3s
      const readyTimer = setTimeout(() => {
        if (mountedRef.current) setPhase("ready");
      }, 3000);

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
            onScan(result.getText());
            onClose();
          }
          void err;
        }
      );

      clearTimeout(readyTimer);
      if (mountedRef.current) setPhase("ready");
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      cleanup();
      const msg = String(err);
      if (msg.includes("NotAllowed") || msg.includes("Permission") || msg.includes("denied")) {
        setErrorMsg("Izin kamera ditolak.\n\nBuka Pengaturan browser lalu izinkan akses Kamera untuk situs ini, kemudian coba lagi.");
      } else if (msg.includes("NotFound") || msg.includes("NotReadable")) {
        setErrorMsg("Kamera tidak dapat diakses. Pastikan kamera tidak dipakai aplikasi lain.");
      } else if (msg.includes("OverconstrainedError")) {
        retryWithAnyCamera();
        return;
      } else {
        setErrorMsg(`Gagal membuka kamera.\n\n${msg}`);
      }
      setPhase("error");
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
      if (mountedRef.current) setPhase("ready");
    } catch {
      if (!mountedRef.current) return;
      cleanup();
      setErrorMsg("Tidak dapat membuka kamera apa pun di perangkat ini.");
      setPhase("error");
    }
  }, [onScan, onClose, cleanup]);

  // Check existing permission on open
  useEffect(() => {
    mountedRef.current = open;
    if (open) {
      setPhase("permission");
      setErrorMsg("");
      // If permission already granted, skip the prompt screen
      if (navigator.permissions) {
        navigator.permissions.query({ name: "camera" as PermissionName }).then((result) => {
          if (result.state === "granted" && mountedRef.current) {
            startScanner();
          }
        }).catch(() => {
          // permissions API not supported, stay on prompt screen
        });
      }
    } else {
      cleanup();
      setPhase("permission");
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

        {/* Permission prompt screen */}
        {phase === "permission" && (
          <div className="flex flex-col items-center justify-center gap-5 px-6 py-10 text-center bg-card">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-base">Izin Akses Kamera</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Aplikasi membutuhkan akses kamera untuk memindai barcode produk.
              </p>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Saat browser meminta izin, pilih <span className="font-medium text-foreground">"Izinkan"</span> atau <span className="font-medium text-foreground">"Allow"</span>.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Button className="w-full gap-2" onClick={startScanner}>
                <Camera className="w-4 h-4" />
                Buka Kamera
              </Button>
              <Button variant="ghost" className="w-full" onClick={handleClose}>
                Batal
              </Button>
            </div>
          </div>
        )}

        {/* Camera viewport — always rendered so videoRef is available */}
        <div
          className="relative bg-black w-full"
          style={{ aspectRatio: "4/3", display: phase === "permission" ? "none" : "block" }}
        >
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
              style={{ display: phase === "error" ? "none" : "block" }}
            />

            {/* Scan frame overlay */}
            {phase === "ready" && (
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
            {phase === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm text-white">Membuka kamera...</p>
              </div>
            )}

            {/* Error overlay */}
            {phase === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-zinc-950">
                <AlertCircle className="w-12 h-12 text-destructive flex-shrink-0" />
                <p className="text-sm text-white leading-relaxed whitespace-pre-line">{errorMsg}</p>
                <Button size="sm" variant="outline" onClick={startScanner} className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Coba Lagi
                </Button>
              </div>
            )}
          </div>

        {/* Footer — hide on permission screen (already has buttons) */}
        {phase !== "permission" && (
          <div className="px-4 py-3 bg-card border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-3">
              {phase === "ready" ? "Arahkan kamera ke barcode produk" : "Menunggu kamera..."}
            </p>
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Batal
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

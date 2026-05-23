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
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannedRef = useRef(false);
  const cancelledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const stopCamera = useCallback(() => {
    try { readerRef.current?.reset(); } catch (_) {}
    readerRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;
    cancelledRef.current = false;
    scannedRef.current = false;
    setError(null);
    setLoading(true);

    try {
      // Request rear camera on mobile
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (cancelledRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.setAttribute("muted", "true");
      video.muted = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = reject;
        setTimeout(resolve, 3000); // fallback timeout
      });

      await video.play();
      setLoading(false);

      // Start ZXing decode loop
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      reader.decodeFromStream(stream, video, (result, err) => {
        if (result && !scannedRef.current && !cancelledRef.current) {
          scannedRef.current = true;
          const code = result.getText();
          stopCamera();
          onScan(code);
          onClose();
        }
        // Suppress NotFoundException spam (expected when no barcode in frame)
        if (err) {
          const msg = err.message ?? "";
          if (!msg.includes("No MultiFormat") && !msg.includes("NotFoundException") && !msg.includes("No barcode")) {
            console.warn("Scanner error:", err);
          }
        }
      });
    } catch (err: unknown) {
      setLoading(false);
      const msg = (err as Error)?.message ?? "";
      if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
        setError("Izin kamera ditolak.\n\nBuka Pengaturan browser → izinkan akses Kamera untuk situs ini, lalu coba lagi.");
      } else if (msg.includes("NotFound") || msg.includes("Devices")) {
        setError("Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.");
      } else {
        setError("Tidak dapat membuka kamera. Coba muat ulang halaman.");
      }
    }
  }, [onScan, onClose, stopCamera]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      cancelledRef.current = true;
      stopCamera();
    }
    return () => {
      cancelledRef.current = true;
      stopCamera();
    };
  }, [open]);

  const handleClose = useCallback(() => {
    cancelledRef.current = true;
    stopCamera();
    onClose();
  }, [onClose, stopCamera]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0 [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{title}</span>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera area */}
        <div className="relative bg-black w-full" style={{ aspectRatio: "4/3" }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />

          {/* Scan frame overlay */}
          {!error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-40">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-primary rounded-tl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-primary rounded-tr" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-primary rounded-bl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-primary rounded-br" />
                {/* Animated scan line */}
                <div
                  className="absolute left-2 right-2 h-0.5 bg-primary/80"
                  style={{ animation: "scanline 2s ease-in-out infinite", top: "50%" }}
                />
              </div>
              <style>{`
                @keyframes scanline {
                  0%, 100% { transform: translateY(-60px); opacity: 0.4; }
                  50% { transform: translateY(60px); opacity: 1; }
                }
              `}</style>
            </div>
          )}

          {/* Loading spinner */}
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
              <Loader2 className="w-9 h-9 text-primary animate-spin" />
              <p className="text-sm text-white">Membuka kamera...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-black/90">
              <AlertCircle className="w-12 h-12 text-destructive flex-shrink-0" />
              <p className="text-sm text-white leading-relaxed whitespace-pre-line">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={startCamera}
                className="gap-2 mt-1"
              >
                <RefreshCw className="w-4 h-4" /> Coba Lagi
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-card border-t border-border">
          <p className="text-xs text-muted-foreground text-center mb-3">
            Arahkan kamera belakang ke barcode produk
          </p>
          <Button variant="outline" className="w-full" onClick={handleClose}>
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

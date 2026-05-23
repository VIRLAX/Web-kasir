import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import { X, Camera, Loader2, AlertCircle } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scannedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    scannedRef.current = false;
    setError(null);
    setLoading(true);

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, err) => {
        if (result && !scannedRef.current) {
          scannedRef.current = true;
          onScan(result.getText());
          onClose();
        }
        if (err && !(err instanceof NotFoundException)) {
          const msg = (err as Error).message ?? "";
          if (!msg.includes("No MultiFormat")) {
            setError("Kamera tidak dapat diakses. Pastikan izin kamera sudah diberikan.");
          }
        }
      })
      .then(() => {
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError("Izin kamera ditolak. Buka pengaturan browser dan izinkan akses kamera.");
      });

    return () => {
      try {
        reader.reset();
      } catch (_) {}
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera area */}
        <div className="relative bg-black aspect-[4/3] w-full flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ display: error ? "none" : "block" }}
          />

          {/* Scan frame overlay */}
          {!error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-52 h-36">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary/60 animate-pulse" />
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-white">Memuat kamera...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-black/90">
              <AlertCircle className="w-10 h-10 text-destructive" />
              <p className="text-sm text-white leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-card">
          <p className="text-xs text-muted-foreground text-center mb-3">
            Arahkan kamera ke barcode produk
          </p>
          <Button variant="outline" className="w-full" onClick={onClose}>
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

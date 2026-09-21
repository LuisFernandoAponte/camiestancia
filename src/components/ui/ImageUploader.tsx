import { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon, CheckCircle2, Eye, Maximize2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  className?: string;
  aspectRatio?: "4/3" | "16/9" | "1/1" | "auto";
}

export function ImageUploader({
  value,
  onChange,
  folder = "la_estancia/general",
  label = "Fotografía o Imagen",
  className = "",
  aspectRatio = "4/3",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(false);
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectClass =
    aspectRatio === "16/9"
      ? "aspect-video"
      : aspectRatio === "1/1"
      ? "aspect-square"
      : aspectRatio === "auto"
      ? "min-h-40"
      : "aspect-[4/3]";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor seleccione un archivo de imagen válido (JPG, PNG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("El archivo excede el tamaño máximo permitido de 5 MB.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || "Error al subir la imagen.");
      }

      onChange(result.data.url);
    } catch (err: any) {
      setError(err?.message || "Error al subir la imagen.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground block">{label}</label>
          {value && (
            <button
              type="button"
              onClick={() => setFitMode(fitMode === "cover" ? "contain" : "cover")}
              className="text-[10px] text-muted-foreground hover:text-foreground transition underline cursor-pointer"
            >
              Ajuste: {fitMode === "cover" ? "Rellenar" : "Completo"}
            </button>
          )}
        </div>
      )}

      {value ? (
        <div
          className={`relative group rounded-2xl overflow-hidden border border-border bg-slate-950/5 dark:bg-slate-900/40 w-full max-h-52 flex items-center justify-center ${aspectClass}`}
        >
          <img
            src={value}
            alt="Vista previa"
            className={`w-full h-full transition duration-300 group-hover:scale-102 ${
              fitMode === "contain" ? "object-contain p-2" : "object-cover object-center"
            }`}
          />
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-2 backdrop-blur-[2px]">
            <button
              type="button"
              onClick={() => setPreviewZoom(true)}
              className="p-2 rounded-full bg-white/90 text-slate-900 hover:bg-white transition shadow-sm cursor-pointer"
              title="Ampliar imagen completa"
            >
              <Maximize2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 rounded-full bg-destructive text-white hover:bg-destructive/90 transition shadow-sm cursor-pointer"
              title="Eliminar imagen"
            >
              <X className="size-4" />
            </button>
          </div>
          <span className="absolute bottom-2 right-2 text-[10px] bg-slate-950/70 text-white px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1">
            <CheckCircle2 className="size-3 text-emerald-400" /> Cloudinary CDN
          </span>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-accent bg-muted/30 hover:bg-muted/60 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="size-6 animate-spin text-accent" />
              <span className="text-xs text-muted-foreground font-medium">Procesando y optimizando en Cloudinary...</span>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-full bg-card group-hover:bg-accent/10 text-muted-foreground group-hover:text-accent transition shadow-xs">
                <Upload className="size-5" />
              </div>
              <div className="text-xs font-medium">Hacé clic para seleccionar una foto</div>
              <div className="text-[10px] text-muted-foreground">JPG, PNG, WEBP (dimensión óptima recomendada 1200x900px, máx 5MB)</div>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="text-xs text-destructive mt-1 font-medium">{error}</p>}

      {/* Lightbox / Zoom Dialog */}
      <Dialog open={previewZoom} onOpenChange={setPreviewZoom}>
        <DialogContent className="sm:max-w-3xl p-2 bg-slate-950/95 border-slate-800 text-white">
          <DialogTitle className="sr-only">Previsualización de Imagen</DialogTitle>
          <DialogDescription className="sr-only">Fotografía cargada en alta resolución</DialogDescription>
          <div className="relative w-full max-h-[80vh] flex items-center justify-center overflow-hidden rounded-lg">
            <img src={value} alt="Vista ampliada" className="max-w-full max-h-[78vh] object-contain rounded-md" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

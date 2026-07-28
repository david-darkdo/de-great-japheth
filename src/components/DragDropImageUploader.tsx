import React, { useState, useEffect, useRef } from "react";
import { Upload, Image as ImageIcon, Trash2, RefreshCw, Edit, AlertCircle } from "lucide-react";

type DragDropImageUploaderProps = {
  label: string;
  required?: boolean;
  file: File | null;
  setFile: (file: File | null) => void;
  existingUrl?: string | null;
  onRemoveExistingUrl?: () => void;
  placeholderText: string;
  helperText?: string;
  accept?: string;
};

export function DragDropImageUploader({
  label,
  required,
  file,
  setFile,
  existingUrl,
  onRemoveExistingUrl,
  placeholderText,
  helperText,
  accept = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic",
}: DragDropImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      const img = new Image();
      img.onload = () => {
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => setDimensions(null);
      img.src = url;

      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (existingUrl) {
      setPreviewUrl(existingUrl);
      const img = new Image();
      img.onload = () => {
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => setDimensions(null);
      img.src = existingUrl;
    } else {
      setPreviewUrl(null);
      setDimensions(null);
    }
  }, [file, existingUrl]);

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMsg(null);
    // Validate image format
    if (!selectedFile.type || !selectedFile.type.startsWith("image/")) {
      setErrorMsg("Invalid file type. Please select a valid image file (JPG, PNG, WEBP, etc.).");
      return;
    }
    setFile(selectedFile);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setErrorMsg(null);
    setFile(null);
    if (onRemoveExistingUrl) onRemoveExistingUrl();
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleBrowseClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-foreground">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        {helperText && <span className="text-[11px] text-muted-foreground">{helperText}</span>}
      </div>

      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        className={`relative border-2 border-dashed rounded-xl p-4 transition-all duration-200 cursor-pointer overflow-hidden ${
          isDragging
            ? "border-gold bg-gold/10 scale-[1.01] shadow-gold"
            : previewUrl
            ? "border-border/80 bg-card hover:border-gold/60"
            : "border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-gold/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />

        {isDragging ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 pointer-events-none">
            <Upload size={36} className="text-gold animate-bounce" />
            <p className="text-base font-bold text-gold">Drop image here</p>
            <p className="text-xs text-muted-foreground">Release to instantly attach image</p>
          </div>
        ) : previewUrl ? (
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="relative group rounded-lg overflow-hidden border border-border bg-black/40 flex items-center justify-center min-h-[160px] max-h-[260px]">
              <img
                src={previewUrl}
                alt="Upload preview"
                className="max-h-[240px] w-auto object-contain rounded-md"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className="px-3 py-1.5 bg-gold text-black font-semibold rounded-md text-xs flex items-center gap-1.5 shadow-gold hover:opacity-90 transition"
                >
                  <RefreshCw size={13} /> Replace Image
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-3 py-1.5 bg-red-500/90 text-white font-semibold rounded-md text-xs flex items-center gap-1.5 hover:bg-red-600 transition"
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs bg-muted/40 p-2.5 rounded-lg border border-border/50">
              <div className="flex items-center gap-2 truncate max-w-[65%]">
                <ImageIcon size={16} className="text-gold flex-shrink-0" />
                <span className="font-medium truncate text-foreground">
                  {file ? file.name : existingUrl ? existingUrl.split("/").pop() || "Uploaded Image" : "Image Attached"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {dimensions && (
                  <span className="text-[11px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded font-mono border border-border/60">
                    {dimensions.width} × {dimensions.height} px
                  </span>
                )}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={handleBrowseClick}
                    className="p-1.5 text-gold hover:bg-gold/10 rounded transition"
                    title="Replace Image"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition"
                    title="Remove Image"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
            <div className="p-3 rounded-full bg-gold/10 text-gold border border-gold/20">
              <Upload size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                <span className="text-gold hover:underline">Click to browse</span> or drag and drop
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{placeholderText}</p>
            </div>
            <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider font-mono">
              PNG, JPG, WEBP, GIF, HEIC (Auto Preview)
            </p>
          </div>
        )}
      </div>

      {errorMsg && (
        <p className="text-xs text-red-400 font-medium flex items-center gap-1.5 mt-1">
          <AlertCircle size={14} /> {errorMsg}
        </p>
      )}
    </div>
  );
}

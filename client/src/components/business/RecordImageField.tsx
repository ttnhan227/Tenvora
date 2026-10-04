import { ChangeEvent, useId, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { prepareRecordImage } from "@/lib/imageUpload";

interface RecordImageFieldProps {
  label: string;
  helpText: string;
  value?: string;
  onChange: (value: string | undefined, removed: boolean) => void;
}

export function RecordImageField({ label, helpText, value, onChange }: RecordImageFieldProps) {
  const id = useId();
  const [processing, setProcessing] = useState(false);
  const { isVietnamese } = useLanguage();

  const selectImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setProcessing(true);
    try {
      onChange(await prepareRecordImage(file), false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not process this image.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-3 rounded-2xl border border-dashed bg-muted/20 p-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-card">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-relaxed text-muted-foreground">{helpText}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild disabled={processing}>
              <label htmlFor={id} className={processing ? "pointer-events-none gap-2" : "cursor-pointer gap-2"}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {value
                  ? (isVietnamese ? "Thay ảnh" : "Replace image")
                  : (isVietnamese ? "Chọn ảnh" : "Choose image")}
              </label>
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined, true)} className="gap-2 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                {isVietnamese ? "Xóa ảnh" : "Remove"}
              </Button>
            )}
          </div>
        </div>
      </div>
      <input id={id} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={selectImage} />
    </div>
  );
}

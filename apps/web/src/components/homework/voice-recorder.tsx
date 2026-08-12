"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadMedia, mediaUrl } from "@/lib/homework/client";

/** Records a short audio note in the browser, uploads it, and reports the media id. */
export function VoiceRecorder({
  value,
  onChange,
}: {
  value?: string;
  onChange: (mediaId: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setUploading(true);
        try {
          onChange(await uploadMedia(blob, "voice"));
        } catch {
          setError("Couldn't save that recording. Try again.");
        } finally {
          setUploading(false);
        }
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      setError("Microphone access was blocked.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="grid gap-2">
      {value && !recording && <audio controls src={mediaUrl(value)} className="w-full" />}
      <div className="flex items-center gap-2">
        {recording ? (
          <Button type="button" variant="destructive" size="sm" onClick={stop}>
            Stop
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={start} disabled={uploading}>
            {uploading ? "Saving…" : value ? "Re-record" : "Record"}
          </Button>
        )}
        {recording && <span className="text-xs text-muted-foreground">Recording…</span>}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

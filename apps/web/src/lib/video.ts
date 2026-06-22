export const VIDEO_PROVIDER = "jitsi";
export const JITSI_DOMAIN = process.env.NEXT_PUBLIC_JITSI_DOMAIN?.trim() || "meet.jit.si";

export function videoRoomUrl(provider: string | null | undefined, roomId: string | null | undefined) {
  if (!roomId || provider !== VIDEO_PROVIDER) return null;
  return `https://${JITSI_DOMAIN}/${encodeURIComponent(roomId)}`;
}

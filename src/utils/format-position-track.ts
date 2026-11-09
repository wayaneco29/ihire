export function formatPositionTrack(track: string) {
  switch (track) {
    case "TEACHING":
      return "Teaching";
    case "NON_TEACHING":
      return "Non-teaching";
    default:
      return "Unknown track";
  }
}

export function formatPositionLabel(title: string, track: string) {
  return `${title} · ${formatPositionTrack(track)}`;
}

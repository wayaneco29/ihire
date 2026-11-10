export function formatPositionTrack(track: string) {
  switch (track) {
    case "TEACHING":
    case "teaching":
      return "Teaching";
    case "NON_TEACHING":
    case "non-teaching":
      return "Non-teaching";
    default:
      return "Unknown track";
  }
}

export function formatPositionLabel(title: string, track: string) {
  return `${title} · ${formatPositionTrack(track)}`;
}

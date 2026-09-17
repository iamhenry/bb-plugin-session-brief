export const SIDE_CARD_WIDTH_PX = 280;
export const SIDE_CARD_SAFE_GAP_PX = 12;
export const SIDE_CARD_RETURN_HYSTERESIS_PX = 24;

export function doesSessionBriefSideCardFit({
  availableGutter,
  currentlyFits,
}: {
  availableGutter: number | null;
  currentlyFits: boolean;
}): boolean {
  if (availableGutter === null) return false;

  const requiredGutter =
    SIDE_CARD_WIDTH_PX +
    SIDE_CARD_SAFE_GAP_PX +
    (currentlyFits ? 0 : SIDE_CARD_RETURN_HYSTERESIS_PX);

  return availableGutter >= requiredGutter;
}

export function isSessionBriefStripLayout({
  isCompactViewport,
  rightPanelOpen,
  sideCardFits,
}: {
  isCompactViewport: boolean;
  rightPanelOpen: boolean;
  sideCardFits: boolean;
}): boolean {
  return isCompactViewport || rightPanelOpen || !sideCardFits;
}

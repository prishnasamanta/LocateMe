import { getVerticalHint } from './relativePosition';

/** Single sentence for slides — no east/west, only distance + vertical. */
export function formatArrivalSentence(distanceM, visitor, destination, perspective = 'visitor') {
  if (distanceM == null) return null;

  const dist = Math.round(distanceM);
  const vertical = getVerticalHint(visitor, destination, perspective);

  if (!vertical) {
    return `${dist} m`;
  }

  const vertText =
    perspective === 'owner'
      ? vertical.text.replace(/^\d+m\s*/i, '')
      : vertical.text.toLowerCase();

  return `${dist} m, ${vertText}`;
}

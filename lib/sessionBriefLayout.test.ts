import assert from "node:assert/strict";
import { test } from "node:test";
import {
  doesSessionBriefSideCardFit,
  isSessionBriefStripLayout,
  SIDE_CARD_RETURN_HYSTERESIS_PX,
  SIDE_CARD_SAFE_GAP_PX,
  SIDE_CARD_WIDTH_PX,
} from "./sessionBriefLayout.ts";

const REQUIRED_GUTTER = SIDE_CARD_WIDTH_PX + SIDE_CARD_SAFE_GAP_PX;

test("session brief side card follows the measured transcript gutter", () => {
  assert.equal(
    doesSessionBriefSideCardFit({
      availableGutter: REQUIRED_GUTTER,
      currentlyFits: true,
    }),
    true,
  );
  assert.equal(
    doesSessionBriefSideCardFit({
      availableGutter: REQUIRED_GUTTER - 1,
      currentlyFits: true,
    }),
    false,
  );
  assert.equal(
    doesSessionBriefSideCardFit({
      availableGutter:
        REQUIRED_GUTTER + SIDE_CARD_RETURN_HYSTERESIS_PX - 1,
      currentlyFits: false,
    }),
    false,
  );
  assert.equal(
    doesSessionBriefSideCardFit({
      availableGutter: REQUIRED_GUTTER + SIDE_CARD_RETURN_HYSTERESIS_PX,
      currentlyFits: false,
    }),
    true,
  );
  assert.equal(
    doesSessionBriefSideCardFit({
      availableGutter: null,
      currentlyFits: true,
    }),
    false,
  );
});

test("session brief uses the strip for unsafe layouts", () => {
  const safe = {
    isCompactViewport: false,
    rightPanelOpen: false,
    sideCardFits: true,
  };

  assert.equal(isSessionBriefStripLayout(safe), false);
  assert.equal(
    isSessionBriefStripLayout({ ...safe, sideCardFits: false }),
    true,
  );
  assert.equal(
    isSessionBriefStripLayout({ ...safe, isCompactViewport: true }),
    true,
  );
  assert.equal(
    isSessionBriefStripLayout({ ...safe, rightPanelOpen: true }),
    true,
  );
});

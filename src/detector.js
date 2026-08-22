(function attachDetector(root, factory) {
  const detector = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = detector;
  }

  root.MembersBegoneDetector = detector;
})(typeof globalThis === "undefined" ? this : globalThis, function createDetector() {
  "use strict";

  const MEMBER_LABEL_PATTERNS = [
    /^members?\s+only$/iu,
    /^kun\s+(?:for\s+)?medlemmer$/iu,
    /^bare\s+for\s+medlemmer$/iu,
    /^(?:endast|bara)\s+för\s+medlemmar$/iu,
    /^nur\s+für\s+mitglieder$/iu,
    /^alleen\s+voor\s+leden$/iu,
    /^réservé(?:e)?\s+aux\s+membres$/iu,
    /^solo\s+para\s+miembros$/iu,
    /^solo\s+per\s+(?:i\s+)?membri$/iu,
    /^apenas\s+para\s+membros$/iu,
    /^tylko\s+dla\s+wspierających$/iu,
    /^pouze\s+pro\s+členy$/iu,
    /^только\s+для\s+(?:участников|спонсоров)$/iu,
    /^メンバー限定$/u,
    /^회원\s*전용$/u,
    /^(?:会员|會員)(?:专享|專享|限定)$/u
  ];

  const STRONG_SIGNAL_SELECTOR = [
    '[badge-style-type="BADGE_STYLE_TYPE_MEMBERS_ONLY"]',
    '[badge-style-type*="MEMBERS_ONLY" i]',
    '[class*="members-only" i]',
    '[icon-name*="members" i]'
  ].join(", ");

  const BADGE_CONTAINER_SELECTOR = [
    "ytd-badge-supported-renderer",
    "yt-badge-shape",
    "badge-shape",
    ".badge-shape-wiz__text",
    "[badge-style-type]"
  ].join(", ");

  const SIGNAL_CANDIDATE_SELECTOR = [
    STRONG_SIGNAL_SELECTOR,
    BADGE_CONTAINER_SELECTOR,
    "[aria-label]"
  ].join(", ");

  const RICH_CARD_SELECTOR = [
    "ytd-rich-item-renderer",
    "ytm-rich-item-renderer"
  ].join(", ");

  const CARD_SELECTOR = [
    "ytd-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-playlist-video-renderer",
    "ytd-reel-item-renderer",
    "yt-lockup-view-model",
    "ytm-video-with-context-renderer",
    "ytm-compact-video-renderer"
  ].join(", ");

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/[\u200B-\u200D\uFEFF]/gu, "")
      .replace(/\s+/gu, " ")
      .trim();
  }

  function matchesMembersOnlyText(value) {
    const normalized = normalizeText(value);
    return normalized.length > 0 && MEMBER_LABEL_PATTERNS.some((pattern) => pattern.test(normalized));
  }

  function isElement(value) {
    return Boolean(value && value.nodeType === 1);
  }

  function safeMatches(element, selector) {
    return isElement(element)
      && typeof element.matches === "function"
      && element.matches(selector);
  }

  function getClosest(element, selector) {
    return isElement(element) && typeof element.closest === "function"
      ? element.closest(selector)
      : null;
  }

  function getAttribute(element, name) {
    return isElement(element) && typeof element.getAttribute === "function"
      ? element.getAttribute(name)
      : null;
  }

  function hasStrongMarker(element) {
    if (safeMatches(element, STRONG_SIGNAL_SELECTOR)) {
      return true;
    }

    const badgeContainer = getClosest(element, BADGE_CONTAINER_SELECTOR);
    return Boolean(badgeContainer && safeMatches(badgeContainer, STRONG_SIGNAL_SELECTOR));
  }

  function hasLocalizedLabel(element) {
    const badgeContainer = safeMatches(element, BADGE_CONTAINER_SELECTOR)
      ? element
      : getClosest(element, BADGE_CONTAINER_SELECTOR);

    const candidates = badgeContainer ? [element, badgeContainer] : [element];

    return candidates.some((candidate) => [
      candidate && candidate.textContent,
      getAttribute(candidate, "aria-label"),
      getAttribute(candidate, "title")
    ].some(matchesMembersOnlyText));
  }

  function isMembersOnlySignal(element) {
    if (!isElement(element)) {
      return false;
    }

    return hasStrongMarker(element) || hasLocalizedLabel(element);
  }

  function collectCandidates(rootNode) {
    const candidates = [];

    if (isElement(rootNode) && safeMatches(rootNode, SIGNAL_CANDIDATE_SELECTOR)) {
      candidates.push(rootNode);
    }

    if (rootNode && typeof rootNode.querySelectorAll === "function") {
      candidates.push(...rootNode.querySelectorAll(SIGNAL_CANDIDATE_SELECTOR));
    }

    return [...new Set(candidates)];
  }

  function findMembersOnlySignals(rootNode) {
    return collectCandidates(rootNode).filter(isMembersOnlySignal);
  }

  function findCard(signalElement) {
    if (!isElement(signalElement)) {
      return null;
    }

    // The rich-item wrapper owns the grid slot. Hiding only its inner lockup
    // leaves a hole in YouTube's CSS grid, so prefer the wrapper when present.
    return getClosest(signalElement, RICH_CARD_SELECTOR)
      || getClosest(signalElement, CARD_SELECTOR);
  }

  function cardHasMembersOnlySignal(cardElement) {
    if (!isElement(cardElement)) {
      return false;
    }

    return findMembersOnlySignals(cardElement)
      .some((signal) => findCard(signal) === cardElement || cardElement.contains(signal));
  }

  return Object.freeze({
    BADGE_CONTAINER_SELECTOR,
    CARD_SELECTOR,
    MEMBER_LABEL_PATTERNS,
    RICH_CARD_SELECTOR,
    SIGNAL_CANDIDATE_SELECTOR,
    STRONG_SIGNAL_SELECTOR,
    cardHasMembersOnlySignal,
    findCard,
    findMembersOnlySignals,
    isMembersOnlySignal,
    matchesMembersOnlyText,
    normalizeText
  });
});

(function runMembersBegone() {
  "use strict";

  const Detector = globalThis.MembersBegoneDetector;

  if (!Detector) {
    console.error("[Members Begone] Detectoren kunne ikke indlæses.");
    return;
  }

  const MARKER_CLASS = "members-begone-card";
  const DEFAULTS = Object.freeze({
    enabled: true,
    mode: "hide"
  });
  const VALID_MODES = new Set(["hide", "placeholder"]);

  let settings = { ...DEFAULTS };
  let totalMarked = 0;
  let flushHandle = null;
  const pendingRoots = new Set();

  function normalizeSettings(value) {
    return {
      enabled: value.enabled !== false,
      mode: VALID_MODES.has(value.mode) ? value.mode : DEFAULTS.mode
    };
  }

  function updateDocumentMode() {
    const root = document.documentElement;
    if (!root) {
      return;
    }

    if (settings.enabled) {
      root.dataset.membersBegoneMode = settings.mode;
    } else {
      delete root.dataset.membersBegoneMode;
    }
  }

  function markCard(card) {
    if (!settings.enabled || !card || !card.isConnected) {
      return false;
    }

    if (card.classList.contains(MARKER_CLASS)) {
      return false;
    }

    card.classList.add(MARKER_CLASS);
    card.setAttribute("data-members-begone", "blocked");
    totalMarked += 1;
    return true;
  }

  function unmarkCard(card) {
    if (!card || !card.classList.contains(MARKER_CLASS)) {
      return;
    }

    card.classList.remove(MARKER_CLASS);
    card.removeAttribute("data-members-begone");
  }

  function clearMarkers() {
    document.querySelectorAll(`.${MARKER_CLASS}`).forEach(unmarkCard);
  }

  function validateMarkedAncestor(rootNode) {
    if (!rootNode || rootNode.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const card = rootNode.matches(`.${MARKER_CLASS}`)
      ? rootNode
      : rootNode.closest(`.${MARKER_CLASS}`);

    if (card && !Detector.cardHasMembersOnlySignal(card)) {
      unmarkCard(card);
    }
  }

  function scanSubtree(rootNode) {
    if (!settings.enabled || !rootNode) {
      return;
    }

    validateMarkedAncestor(rootNode);

    Detector.findMembersOnlySignals(rootNode)
      .map(Detector.findCard)
      .filter(Boolean)
      .forEach(markCard);
  }

  function fullScan() {
    if (!settings.enabled) {
      return;
    }

    document.querySelectorAll(`.${MARKER_CLASS}`).forEach((card) => {
      if (!Detector.cardHasMembersOnlySignal(card)) {
        unmarkCard(card);
      }
    });

    scanSubtree(document);
  }

  function scheduleFlush() {
    if (flushHandle !== null) {
      return;
    }

    const flush = () => {
      flushHandle = null;
      const roots = [...pendingRoots];
      pendingRoots.clear();

      if (roots.length > 30 || roots.includes(document.documentElement)) {
        fullScan();
        return;
      }

      roots.forEach(scanSubtree);
    };

    if (typeof requestIdleCallback === "function") {
      flushHandle = requestIdleCallback(flush, { timeout: 400 });
    } else {
      flushHandle = setTimeout(flush, 80);
    }
  }

  function queueRoot(node) {
    if (!settings.enabled || !node) {
      return;
    }

    const root = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!root) {
      return;
    }

    pendingRoots.add(root);
    scheduleFlush();
  }

  function handleMutations(mutations) {
    for (const mutation of mutations) {
      const target = mutation.target.nodeType === Node.TEXT_NODE
        ? mutation.target.parentElement
        : mutation.target;

      if (target) {
        const markedCard = target.closest && target.closest(`.${MARKER_CLASS}`);
        queueRoot(markedCard || target);
      }

      mutation.addedNodes.forEach(queueRoot);
    }
  }

  function applySettings(nextSettings) {
    const wasEnabled = settings.enabled;
    settings = normalizeSettings(nextSettings);
    updateDocumentMode();

    if (!settings.enabled) {
      clearMarkers();
      return;
    }

    if (!wasEnabled || settings.enabled) {
      fullScan();
    }
  }

  function getStatus() {
    return {
      enabled: settings.enabled,
      mode: settings.mode,
      currentBlocked: document.querySelectorAll(`.${MARKER_CLASS}`).length,
      totalMarked
    };
  }

  const observer = new MutationObserver(handleMutations);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["aria-label", "badge-style-type", "class", "icon-name", "title"],
    characterData: true,
    childList: true,
    subtree: true
  });

  document.addEventListener("yt-navigate-finish", fullScan, true);
  document.addEventListener("yt-page-data-updated", fullScan, true);

  chrome.storage.sync.get(DEFAULTS)
    .then(applySettings)
    .catch(() => applySettings(DEFAULTS));

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }

    const nextSettings = {
      enabled: changes.enabled ? changes.enabled.newValue : settings.enabled,
      mode: changes.mode ? changes.mode.newValue : settings.mode
    };
    applySettings(nextSettings);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === "members-begone:get-status") {
      sendResponse(getStatus());
      return false;
    }

    if (message && message.type === "members-begone:rescan") {
      fullScan();
      sendResponse(getStatus());
      return false;
    }

    return false;
  });
})();

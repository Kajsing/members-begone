"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Detector = require("../src/detector.js");

function splitSelectors(selector) {
  return selector.split(",").map((part) => part.trim()).filter(Boolean);
}

function matchesSimpleSelector(element, selector) {
  if (selector.startsWith(".")) {
    return (element.className || "").split(/\s+/u).includes(selector.slice(1));
  }

  if (selector.startsWith("[")) {
    const match = selector.match(/^\[([^\]=*]+)(?:([*]?=)"([^"]*)"(?:\s+i)?)?\]$/iu);
    if (!match) {
      return false;
    }

    const [, name, operator, expected = ""] = match;
    const actual = element.getAttribute(name);
    if (actual === null) {
      return false;
    }
    if (!operator) {
      return true;
    }

    const left = actual.toLocaleLowerCase();
    const right = expected.toLocaleLowerCase();
    return operator === "*=" ? left.includes(right) : left === right;
  }

  return element.tagName.toLocaleLowerCase() === selector.toLocaleLowerCase();
}

class FakeElement {
  constructor(tagName, options = {}) {
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this.textContent = options.text || "";
    this.className = options.className || "";
    this.attributes = new Map(Object.entries(options.attributes || {}));
    this.children = [];
    this.parentElement = null;
  }

  append(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  contains(candidate) {
    return candidate === this || this.children.some((child) => child.contains(candidate));
  }

  getAttribute(name) {
    if (name === "class") {
      return this.className || null;
    }
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  matches(selector) {
    return splitSelectors(selector).some((part) => matchesSimpleSelector(this, part));
  }

  closest(selector) {
    for (let current = this; current; current = current.parentElement) {
      if (current.matches(selector)) {
        return current;
      }
    }
    return null;
  }

  querySelectorAll(selector) {
    return this.children.flatMap((child) => [
      ...(child.matches(selector) ? [child] : []),
      ...child.querySelectorAll(selector)
    ]);
  }
}

test("normaliserer usynlige tegn og mellemrum", () => {
  assert.equal(Detector.normalizeText("  Members\u200B   only  "), "Members only");
});

test("genkender engelske og danske medlemsbadges", () => {
  assert.equal(Detector.matchesMembersOnlyText("Members only"), true);
  assert.equal(Detector.matchesMembersOnlyText("Kun for medlemmer"), true);
  assert.equal(Detector.matchesMembersOnlyText("KUN MEDLEMMER"), true);
});

test("genkender lokaliserede badges uden at ramme almindelige titler", () => {
  assert.equal(Detector.matchesMembersOnlyText("Nur für Mitglieder"), true);
  assert.equal(Detector.matchesMembersOnlyText("メンバー限定"), true);
  assert.equal(Detector.matchesMembersOnlyText("My members only Q&A is public now"), false);
  assert.equal(Detector.matchesMembersOnlyText("Membership benefits"), false);
});

test("finder et tekstbaseret badge i et videokort", () => {
  const card = new FakeElement("ytd-video-renderer");
  const badge = card.append(new FakeElement("ytd-badge-supported-renderer", { text: "Members only" }));

  assert.equal(Detector.isMembersOnlySignal(badge), true);
  assert.deepEqual(Detector.findMembersOnlySignals(card), [badge]);
  assert.equal(Detector.findCard(badge), card);
  assert.equal(Detector.cardHasMembersOnlySignal(card), true);
});

test("genkender YouTubes aktuelle badge-shape markup", () => {
  const richItem = new FakeElement("ytd-rich-item-renderer");
  const lockup = richItem.append(new FakeElement("yt-lockup-view-model"));
  const viewModel = lockup.append(new FakeElement("yt-badge-view-model"));
  const badge = viewModel.append(new FakeElement("badge-shape", { text: "Members only" }));

  assert.deepEqual(Detector.findMembersOnlySignals(richItem), [badge]);
  assert.equal(Detector.findCard(badge), richItem);
  assert.equal(Detector.cardHasMembersOnlySignal(richItem), true);
});

test("bruger YouTubes strukturelle badge-marker uafhængigt af sprog", () => {
  const badge = new FakeElement("span", {
    text: "Membresía",
    attributes: { "badge-style-type": "BADGE_STYLE_TYPE_MEMBERS_ONLY" }
  });

  assert.equal(Detector.isMembersOnlySignal(badge), true);
});

test("foretrækker rich-item-wrapperen, så grid-hullet kollapser", () => {
  const richItem = new FakeElement("ytd-rich-item-renderer");
  const lockup = richItem.append(new FakeElement("yt-lockup-view-model"));
  const badge = lockup.append(new FakeElement("yt-badge-shape", { text: "Members only" }));

  assert.equal(Detector.findCard(badge), richItem);
});

test("ignorerer normale YouTube-badges", () => {
  const card = new FakeElement("ytd-rich-item-renderer");
  card.append(new FakeElement("ytd-badge-supported-renderer", { text: "New" }));

  assert.equal(Detector.findMembersOnlySignals(card).length, 0);
  assert.equal(Detector.cardHasMembersOnlySignal(card), false);
});

test("genkender et eksakt aria-label som fallback", () => {
  const card = new FakeElement("ytd-compact-video-renderer");
  const badge = card.append(new FakeElement("span", {
    attributes: { "aria-label": "Members only" }
  }));

  assert.equal(Detector.isMembersOnlySignal(badge), true);
  assert.equal(Detector.findCard(badge), card);
});

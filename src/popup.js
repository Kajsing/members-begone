(function runPopup() {
  "use strict";

  const DEFAULTS = Object.freeze({ enabled: true, mode: "hide" });
  const enabledInput = document.querySelector("#enabled");
  const modeFieldset = document.querySelector("#mode-fieldset");
  const modeInputs = [...document.querySelectorAll('input[name="mode"]')];
  const rescanButton = document.querySelector("#rescan");
  const statusText = document.querySelector("#status-text");

  function renderSettings(settings) {
    enabledInput.checked = settings.enabled !== false;
    modeFieldset.disabled = !enabledInput.checked;
    const selectedMode = settings.mode === "placeholder" ? "placeholder" : "hide";
    modeInputs.forEach((input) => {
      input.checked = input.value === selectedMode;
    });
  }

  function renderStatus(status) {
    if (!status) {
      statusText.textContent = "Åbn YouTube for at bruge udvidelsen.";
      return;
    }

    if (!status.enabled) {
      statusText.textContent = "Udvidelsen er sat på pause.";
      return;
    }

    const count = Number(status.currentBlocked) || 0;
    statusText.textContent = count === 1
      ? "1 medlemsvideo er fjernet på siden."
      : `${count} medlemsvideoer er fjernet på siden.`;
  }

  async function getActiveYouTubeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab && /^https:\/\/(?:www\.|m\.)?youtube\.com\//i.test(tab.url || "") ? tab : null;
  }

  async function requestStatus(type = "members-begone:get-status") {
    try {
      const tab = await getActiveYouTubeTab();
      if (!tab || typeof tab.id !== "number") {
        renderStatus(null);
        return;
      }

      const status = await chrome.tabs.sendMessage(tab.id, { type });
      renderStatus(status);
    } catch (_error) {
      statusText.textContent = "Genindlæs YouTube-fanen for at aktivere udvidelsen.";
    }
  }

  enabledInput.addEventListener("change", async () => {
    const enabled = enabledInput.checked;
    modeFieldset.disabled = !enabled;
    await chrome.storage.sync.set({ enabled });
    await requestStatus();
  });

  modeInputs.forEach((input) => {
    input.addEventListener("change", async () => {
      if (!input.checked) {
        return;
      }

      await chrome.storage.sync.set({ mode: input.value });
      await requestStatus();
    });
  });

  rescanButton.addEventListener("click", async () => {
    rescanButton.disabled = true;
    await requestStatus("members-begone:rescan");
    rescanButton.disabled = false;
  });

  renderSettings(DEFAULTS);

  if (!globalThis.chrome?.storage?.sync || !chrome.tabs) {
    renderStatus(null);
    return;
  }

  chrome.storage.sync.get(DEFAULTS)
    .then((settings) => {
      renderSettings(settings);
      return requestStatus();
    })
    .catch(() => {
      renderSettings(DEFAULTS);
      renderStatus(null);
    });
})();

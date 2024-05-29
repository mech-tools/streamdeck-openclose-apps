import streamDeck, { ActionInfo, RegistrationInfo } from "@elgato/streamdeck";
import { Settings } from "../types/settings";

/**
 * DEFAULTS & STORE
 * ----
 */
const defaultSettings: Settings = {
  application: {
    path: null,
    executable: null,
    name: null
  },
  arguments: null,
  singleInstance: true,
  windowStyle: "Normal",
  shortPressAction: "RUN",
  doublePressAction: "NONE",
  longPressAction: "CLOSE",
  shortPressThreshold: 200,
  longPressThreshold: 500,
  monitor: true,
  icon: {
    off: null,
    on: null
  }
};

interface Store {
  settings?: Settings;
}

const store: Store = {};

/**
 * PI
 * ----
 */
streamDeck.onDidConnect(
  async (info: RegistrationInfo, { payload: { settings } }: ActionInfo<Settings>) => {
    store.settings = settings;

    if (Object.keys(store.settings).length === 0) {
      saveSettings(defaultSettings);
    }

    Object.entries(store.settings).forEach(([key, value]) => {
      const els = document.getElementsByName(key) as NodeListOf<HTMLInputElement>;
      if (els.length < 1) return;

      if (els[0].type === "checkbox") {
        els[0].checked = value as boolean;
      } else if (els[0].type === "radio") {
        const radio = Array.from(els).find((el) => el.value === value);
        radio.checked = true;
      } else if (els[0].type === "file") {
        if (els[0].name === "application" && (value as Settings["application"]).executable) {
          const label = document.getElementById(`${els[0].name}Label`);
          label.textContent = (value as Settings["application"]).executable;
        }
      } else {
        els[0].value = value as string;
      }
    });

    activateElements();
  }
);

function activateElements() {
  const fromAppRadio = document.getElementById("fromApp") as HTMLInputElement;

  if (store.settings.application.path) {
    fromAppRadio.disabled = false;
    fromAppRadio.parentElement.classList.remove("disabled-field");
  }

  const applicationLabel = document.getElementById("applicationLabel") as HTMLLabelElement;

  applicationLabel.addEventListener("change", function () {
    if (store.settings.application.path) {
      fromAppRadio.disabled = false;
      fromAppRadio.parentElement.classList.remove("disabled-field");
    } else {
      fromAppRadio.disabled = true;
      fromAppRadio.parentElement.classList.add("disabled-field");
    }
  });

  const radios = document.getElementsByName("iconSource") as NodeListOf<HTMLInputElement>;
  const fileField = document.getElementById("fromFileInput");
  const file = document.getElementById("icon") as HTMLInputElement;

  for (const radio of radios) {
    radio.addEventListener("change", function (event) {
      const target = event.target as HTMLInputElement;

      if (target.value === "fromFile") {
        file.disabled = false;
        fileField.classList.remove("disabled-field");
      } else {
        file.disabled = true;
        fileField.classList.add("disabled-field");
      }
    });
  }
}

/**
 * PI CHANGED & CREATOR
 * ----
 */
export const processChanges = debounce((el: HTMLInputElement) => setSettings(el));

function setSettings(el: HTMLInputElement) {
  const newSettings = structuredClone(store.settings);

  if (el.type === "file") {
    if (el.name === "application") {
      const path = decodeURIComponent(el.value.replace(/^C:\\fakepath\\/, ""));
      const executable = path.substring(path.lastIndexOf("/") + 1);
      const name = executable.substring(0, executable.lastIndexOf("."));

      const label = document.getElementById(`${el.name}Label`);
      label.textContent = executable;

      newSettings[el.name].path = path;
      newSettings[el.name].executable = executable;
      newSettings[el.name].name = name;

      saveSettings(newSettings);
      const event = new Event("change");
      label.dispatchEvent(event);
    }
    return;
  }

  if (el.type === "checkbox") {
    newSettings[el.name] = el.checked;
  } else if (el.type === "range") {
    newSettings[el.name] = parseInt(el.value);
  } else {
    newSettings[el.name] = el.value;
  }
  saveSettings(newSettings);
}

/**
 * CREATOR
 * ----
 */

// TODO: remove with fixed streamDeck.plugin.fetch
streamDeck.plugin.onSendToPropertyInspector(({ payload }: { payload: any }) => {
  generateIcons(payload.icon);
});

export const generateIcons = async (base64Icon?: string) => {
  const fromFile = document.getElementById("fromFile") as HTMLInputElement;
  const newSettings = structuredClone(store.settings);
  const iconOn = document.getElementById("iconOn") as HTMLImageElement;
  const iconOff = document.getElementById("iconOff") as HTMLImageElement;
  const canvas = document.getElementById("iconCanvas") as HTMLCanvasElement;
  const marginValue = document.getElementById("iconMargins") as HTMLInputElement;
  const saturationValue = document.getElementById("iconSaturation") as HTMLInputElement;
  const dotActive = document.getElementById("dotActive") as HTMLInputElement;
  const icon = new Image();
  let path: string;

  if (fromFile.checked) {
    const input = document.getElementById("icon") as HTMLInputElement;
    if (!input.value) return;

    path = decodeURIComponent(input.value.replace(/^C:\\fakepath\\/, ""));
  } else {
    /*     const request = await streamDeck.plugin.fetch("/extract-icon", {
      path: store.settings.application.path
    });

    path = (request.body as { icon: string }).icon;
 */
    // TODO: to be replaced with fixed streamDeck.plugin.fetch
    if (!base64Icon) {
      streamDeck.plugin.sendToPlugin({
        event: "extract-icon",
        path: store.settings.application.path
      });

      return;
    }
  }

  icon.onload = function () {
    const size = 256;
    const margin = size * (parseInt(marginValue.value) / 100);

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(icon, margin, margin, size - margin * 2, size - margin * 2);

    if (dotActive.checked) {
      const dotColor = (document.getElementById("dotColor") as HTMLInputElement).value;
      const dotsize = parseInt((document.getElementById("dotSize") as HTMLInputElement).value);

      ctx.beginPath();
      ctx.arc(size - dotsize - 20, dotsize + 20, dotsize, 0, Math.PI * 2, false);
      ctx.fillStyle = dotColor;
      ctx.fill();
    }

    iconOn.src = canvas.toDataURL();
    newSettings.icon.on = iconOn.src;

    ctx.clearRect(0, 0, size, size);

    ctx.filter = `saturate(${saturationValue.value}%)`;
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(icon, margin, margin, size - margin * 2, size - margin * 2);
    iconOff.src = canvas.toDataURL();
    newSettings.icon.off = iconOff.src;

    ctx.filter = "";
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, size, size);

    saveSettings(newSettings);
  };

  icon.src = base64Icon ? base64Icon : path;
};

/**
 * GLOBAL - TABS
 * ----
 */
function activateTabs(activeTab: string = undefined) {
  const allTabs = Array.from(document.querySelectorAll(".tab")) as HTMLElement[];
  let activeTabEl = null;
  allTabs.forEach((el, i) => {
    el.onclick = () => clickTab(el);
    if (el.dataset?.target === activeTab) {
      activeTabEl = el;
    }
  });
  if (activeTabEl) {
    clickTab(activeTabEl);
  } else if (allTabs.length) {
    clickTab(allTabs[0]);
  }
}

function clickTab(clickedTab: HTMLElement) {
  const allTabs = Array.from(document.querySelectorAll(".tab")) as HTMLElement[];
  allTabs.forEach((el, i) => el.classList.remove("selected"));
  clickedTab.classList.add("selected");

  allTabs.forEach((el, i) => {
    if (el.dataset.target) {
      const t = document.querySelector(el.dataset.target) as HTMLElement;
      if (t) {
        t.style.display = el == clickedTab ? "block" : "none";
      }
    }
  });
}

activateTabs();

/**
 * UTILS
 * ----
 */
function debounce(func: (...args: any[]) => void, timeout = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}

function saveSettings(settings: Settings) {
  streamDeck.settings.setSettings(settings);
  store.settings = settings;
}

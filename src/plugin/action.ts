import streamDeck, {
  Action,
  action,
  DidReceiveSettingsEvent,
  JsonValue,
  KeyDownEvent,
  KeyUpEvent,
  SendToPluginEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent
} from "@elgato/streamdeck";
import CommandRunner from "./services/CommandRunner";
import ProcessMonitor from "./services/ProcessMonitor";
import { RouteAction, Settings } from "../types/settings";
import { extractIcon, isProcessRunning } from "./utils";

/**
 * OpenClose action.
 * @class OpenClose
 * @extends {SingletonAction<Settings>}
 */
@action({ UUID: "com.darkdindon.openclose-apps.openclose" })
class OpenClose extends SingletonAction<Settings> {
  constructor() {
    super();
    // this.#registerRoutes();
  }

  /**
   * ------------------------------------------
   * -------- KEY PRESS EVENTS RELATED --------
   * ------------------------------------------
   */

  /** Services */
  #commandRunner = new CommandRunner();

  /** Using this to detect short, double and long press */
  #shortKeyPressTimeout: ReturnType<typeof setTimeout>;
  #longKeyPressTimeout: ReturnType<typeof setTimeout>;
  #isLongKeyPress = false;
  #shortKeyPressCount = 0;
  #pressEvents = {
    SHORT: "shortPressAction",
    DOUBLE: "doublePressAction",
    LONG: "longPressAction"
  };

  /**
   * On key down event.
   * This will start a timeout that will simulate a long key press if the user
   * doesn't release the key before the threshold.
   * @param {KeyDownEvent<Settings>} event the event associated with the key
   * @memberof OpenClose
   */
  onKeyDown({ payload: { settings } }: KeyDownEvent<Settings>): void {
    // Stop any short/double key press timeout early
    clearTimeout(this.#shortKeyPressTimeout);

    // As soon as the key is pressed, initiate a long key press timeout
    this.#longKeyPressTimeout = setTimeout(() => {
      this.#isLongKeyPress = true;

      this.#routeAction(this.#pressEvents.LONG, settings);
    }, settings.longPressThreshold);
  }

  /**
   * On key up event.
   * This will start a timeout that will simulate a short or double key press if the user
   * did not initiate a long key press first.
   * The short/double mechanism counts the number of key up events before the threshold
   * and purposely ignores the number of key up events if it exceeds 2.
   * @param {KeyDownEvent<Settings>} event the event associated with the key
   * @memberof OpenClose
   */
  onKeyUp({ payload: { settings } }: KeyUpEvent<Settings>): void {
    // Stop any long key press timeout early so we don't trigger
    // long key press interaction on key up
    clearTimeout(this.#longKeyPressTimeout);

    // If long key press was executed, reset and return. We don't want a
    // short/double key press interaction after a long key press
    if (this.#isLongKeyPress) {
      this.#isLongKeyPress = false;
      this.#shortKeyPressCount = 0;
      return;
    }

    // Starting from 0, count the number of key pressed on key up then initiate
    // a short/double key press timeout that will reset the key pressed count upon completion
    this.#shortKeyPressCount++;
    this.#shortKeyPressTimeout = setTimeout(() => {
      if (this.#shortKeyPressCount === 1) {
        this.#routeAction(this.#pressEvents.SHORT, settings);
      } else if (this.#shortKeyPressCount === 2) {
        this.#routeAction(this.#pressEvents.DOUBLE, settings);
      }

      this.#shortKeyPressCount = 0;
    }, settings.shortPressThreshold);
  }

  /**
   * Route a press event to the correct action according to key configuration (settings).
   * @param {PressEventValue} type the type of event
   * @param {Settings} settings the settings of the key
   * @memberof OpenClose
   */
  async #routeAction(type: string, settings: Settings): Promise<void> {
    // Do nothing if no application is provided
    if (!["path", "executable", "name"].every((key) => settings.application?.[key])) return;

    // Get the appropriate route
    const route = settings[type] as RouteAction;

    // If route is "NONE", do nothing
    if (route === "NONE") return;

    // Check if the process is currently running as we need it to decide what to do
    const isRunning = await isProcessRunning(settings.application.executable);

    // Run the appropriate command depending on the route provided
    switch (route) {
      case "RUN":
        if (!settings.singleInstance || !isRunning) this.#commandRunner.runProcess(settings);
        else this.#commandRunner.focusProcess(settings);
        break;
      case "RUNADMIN":
        if (!settings.singleInstance || !isRunning) this.#commandRunner.runProcessAsAdmin(settings);
        break;
      case "FOCUS":
        if (isRunning) this.#commandRunner.focusProcess(settings);
        break;
      case "CLOSE":
        if (isRunning) this.#commandRunner.closeProcess(settings);
        break;
      case "KILL":
        if (isRunning) this.#commandRunner.killProcess(settings);
        break;
      default:
        break;
    }
  }

  /**
   * --------------------------------------------------------
   * -------- SETTINGS AND DIS/APPEAR EVENTS RELATED --------
   * --------------------------------------------------------
   */

  /** Services */
  #processMonitor = new ProcessMonitor();

  /**
   * TODO: Reimplement this when fetch is fixed
   * Register all API routes for this action.
   * 1. "/extract-icon" will extrat and return a base64 image of an
   * executable based on its path.
   */
  /* #registerRoutes(): void {
    streamDeck.ui.registerRoute("/extract-icon", async (req, res) => {
      const icon = await extractIcon((req.body as { path: string }).path);
      res.success({ message: "allo" });
    });
  } */

  async onSendToPlugin(ev: SendToPluginEvent<any, Settings>): Promise<void> {
    if (ev.payload.event === "extract-icon") {
      const icon = await extractIcon(ev.payload.path);
      ev.action.sendToPropertyInspector({ icon });
    }
  }

  /**
   * On changed settings event.
   * this will start or stop monitoring according to settings.
   * This will also update icons.
   * @param {DidReceiveSettingsEvent<Settings>} event the event associated with the key
   * @memberof OpenClose
   */
  onDidReceiveSettings({ action, payload: { settings } }: DidReceiveSettingsEvent<Settings>): void {
    if (settings.icon?.off && settings.icon?.on) this.#updateIcons(action, settings);

    if (!["path", "executable", "name"].every((key) => settings.application?.[key])) return;

    if (settings.monitor) this.#startMonitoring(action, settings);
    else this.#stopMonitoring(action, settings);
  }

  /**
   * On key will appear on screen event.
   * this will start monitoring according to settings.
   * This will also update icons.
   * @param {onWillAppear<Settings>} event the event associated with the key
   * @memberof OpenClose
   */
  async onWillAppear({ action, payload: { settings } }: WillAppearEvent<Settings>): Promise<void> {
    if (settings.icon?.off && settings.icon?.on) this.#updateIcons(action, settings);

    if (!["path", "executable", "name"].every((key) => settings.application?.[key])) return;
    if (!settings.monitor) return;

    this.#startMonitoring(action, settings);
  }

  /**
   * On key will disappear off screen event.
   * this will stop monitoring.
   * @param {onWillDisappear<Settings>} event the event associated with the key
   * @memberof OpenClose
   */
  onWillDisappear({ action, payload: { settings } }: WillDisappearEvent<Settings>): void {
    if (!["path", "executable", "name"].every((key) => settings.application?.[key])) return;
    if (!settings.monitor) return;

    this.#stopMonitoring(action, settings);
  }

  /**
   * Set the images for both states
   * @param {Action<Settings>} action the action associated with the key
   * @param {Settings} settings the settings associated with the key
   * @memberof OpenClose
   */
  #updateIcons(action: Action<Settings>, settings: Settings): void {
    action.setImage(settings.icon.off, { state: 0, target: 0 });
    action.setImage(settings.icon.on, { state: 1, target: 0 });
  }

  /**
   * Start monitoring the application process.
   * @param {Action<Settings>} action the action associated with the key
   * @param {Settings} settings the settings associated with the key
   * @memberof OpenClose
   */
  async #startMonitoring(action: Action<Settings>, settings: Settings): Promise<void> {
    (await isProcessRunning(settings.application.executable))
      ? action.setState(1)
      : action.setState(0);

    this.#processMonitor.subscribe(settings.application.executable, action.id, (event) => {
      if (event === "started") action.setState(1);
      else action.setState(0);
    });
  }

  /**
   * Stop monitoring the application process.
   * @param {Action<Settings>} action the action associated with the key
   * @param {Settings} settings the settings associated with the key
   * @memberof OpenClose
   */
  #stopMonitoring(action: Action<Settings>, settings: Settings): void {
    this.#processMonitor.unsubscribe(settings.application.executable, action.id);
    action.setState(0);
  }
}

export default OpenClose;

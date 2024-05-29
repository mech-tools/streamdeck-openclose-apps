import streamDeck from "@elgato/streamdeck";
import { resolve } from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { Settings } from "../../types/settings";

/**
 * Service dedicated to run shell commands using powershell scripts.
 * @class CommandRunner
 */
class CommandRunner {
  /** Powershell script directory */
  #scriptDirectory = resolve(fileURLToPath(import.meta.url), "../..", "scripts");

  /**
   * Run a process depending of the configuration.
   * @param {Settings} settings
   * @param {asAdmin} [asAdmin=false] options
   * @memberof CommandRunner
   */
  runProcess(settings: Settings, asAdmin: boolean = false): void {
    const parameters = ["-path", settings.application.path];
    if (settings.windowStyle === "Closed") parameters.push("-closeWindow");
    else parameters.push("-WindowStyle", settings.windowStyle);
    if (settings.arguments) parameters.push("-Arguments", settings.arguments);
    if (asAdmin) parameters.push("-RunAsAdmin");

    this.#run("run.ps1", parameters);
  }

  /**
   * Run a process with elevated privileges.
   * @param {Settings} settings
   * @memberof CommandRunner
   */
  runProcessAsAdmin(settings: Settings): void {
    const asAdmin = true;

    this.runProcess(settings, asAdmin);
  }

  /**
   * Focus the process (window).
   * @param {Settings} settings
   * @memberof CommandRunner
   */
  focusProcess(settings: Settings): void {
    const parameters = ["-program", settings.application.name];

    this.#run("focus.ps1", parameters);
  }

  /**
   * Request a "close" event to a process.
   * @param {Settings} settings
   * @memberof CommandRunner
   */
  closeProcess(settings: Settings): void {
    const parameters = ["-program", settings.application.name];

    this.#run("close.ps1", parameters);
  }

  /**
   * Kill all instances of a process.
   * @param {Settings} settings
   * @memberof CommandRunner
   */
  killProcess(settings: Settings): void {
    const parameters = ["-program", settings.application.name];

    this.#run("kill.ps1", parameters);
  }

  /**
   * Run a powershell script.
   * This will log any powershell error to the logs.
   * @param {string} file  file to run
   * @param {string[]} [parameters]  an array of parameters to pass to the command
   * @memberof CommandRunner
   */
  #run(file: string, parameters?: string[]) {
    const ps = spawn("powershell", ["-ExecutionPolicy", "Bypass", "-File", file, ...parameters], {
      cwd: this.#scriptDirectory
    });

    // Log errors
    ps.stderr.on("data", (data) => {
      streamDeck.logger.error(
        `Error while executing powershell script "${file}" with parameters "${parameters}": ${data}`
      );
    });
  }
}

export default CommandRunner;

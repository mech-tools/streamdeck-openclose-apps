import childProcess from "child_process";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { promisify } from "node:util";

/** Utils */
const binaryPath = resolve(fileURLToPath(import.meta.url), "../..", "vendor");
const execFile = promisify(childProcess.execFile);

/**
 * Get the list of all processes currently running.
 * @return {Promise<string[]>}  the list of processes
 */
async function getProcessList(): Promise<string[]> {
  const { stdout } = await execFile(`${binaryPath}\\fastlist-0.3.0-x64`, {
    maxBuffer: 1000 * 1000 * 10,
    windowsHide: true
  });

  return stdout
    .trim()
    .split("\r\n")
    .map((line) => line.split("\t"))
    .reduce((accumulator, [pid, ppid, name]) => {
      accumulator.push(name);
      return accumulator;
    }, []);
}

/**
 * Check of a process is currently running.
 * @param {string} executable the executable name
 * @return {Promise<boolean>} is ruunning
 */
async function isProcessRunning(executable: string): Promise<boolean> {
  let processList = await getProcessList();

  return processList.some((process) => process === executable);
}

/**
 * Will extrat and return a base64 image of an executable based on its path.
 * @param {string} path the path to the executable
 * @return {string}  the base64 encoded image (png)
 */
async function extractIcon(path: string): Promise<string> {
  const { stdout } = await execFile(`${binaryPath}\\win-icon-extractor.exe`, [path], {
    maxBuffer: 1000 * 1000 * 10,
    windowsHide: true
  });

  return "data:image/png;base64, " + stdout;
}

export { getProcessList, isProcessRunning, extractIcon };

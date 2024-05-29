import { getProcessList } from "../utils";

type OberserverEvents = "started" | "stopped";

/**
 * Service dedicated to run monitor processes and notify observers.
 * @class ProcessMonitor
 */
class ProcessMonitor {
  /** Internal properties */
  #timeout: ReturnType<typeof setTimeout>;
  #interval = 1000;
  #observers = new Map<string, Map<string, (event: OberserverEvents) => void>>();
  #cache = new Set<string>();

  /**
   * Starts the monitoring and notyfying by setting up a timeout
   * @memberof ProcessMonitor
   */
  #start(): void {
    this.#timeout = setInterval(async () => {
      const processList = await getProcessList();
      this.#monitorChanges(processList);
    }, this.#interval);
  }

  /**
   * Stop monitoring and notyfying
   * @memberof ProcessMonitor
   */
  #stop(): void {
    clearInterval(this.#timeout);
    this.#cache.clear();
  }

  /**
   * Determine the newly started and stopped processes.
   * Then notify by calling the callBack method of each observer with the appropriate event.
   * This uses Set.prototype.has instead of Array.prototype.map or filter for performances.
   * @param {string[]} processList a list of processes to compare to
   * @memberof ProcessMonitor
   */
  #monitorChanges(processList: string[]): void {
    const observed = new Set(this.#observers.keys());

    // Filter current list to match observed processes only (we don't need the rest)
    // Note: this will also dedup processes by name
    const current = new Set(processList.filter((process) => observed.has(process)));

    // Compare current with cache for newly started processes then notify
    for (const process of current.values()) {
      if (!this.#cache.has(process)) {
        this.#notify(process, "started");
      }
    }

    // Compare cache with current for newly stopped processes then notify
    for (const process of this.#cache.values()) {
      if (!current.has(process)) {
        this.#notify(process, "stopped");
      }
    }

    // Replace previous cache with the new version
    this.#cache = current;
  }

  /**
   * Loop over obervers and execute callBack with the appropriate event value.
   * @param {string} process the process name for which observers should be notified
   * @param {OberserverEvents} event the type of event
   * @memberof ProcessMonitor
   */
  #notify(process: string, event: OberserverEvents): void {
    for (const callBack of this.#observers.get(process).values()) {
      callBack(event);
    }
  }

  /**
   * Subscribe to monitoring.
   * @param {string} executable the process name to monitor
   * @param {string} uid a uid for the observer
   * @param {(event: OberserverEvents) => void} callBack the callback to execute when notified
   * @memberof ProcessMonitor
   */
  subscribe(executable: string, uid: string, callBack: (event: OberserverEvents) => void): void {
    if (!this.#observers.has(executable)) {
      this.#observers.set(executable, new Map());
    }

    // Add observer and start monitoring if there was no other observers
    this.#observers.get(executable).set(uid, callBack);
    if (this.#observers.size === 1 && this.#observers.entries().next().value[1].size === 1)
      this.#start();
  }

  /**
   * Unsubscribe from monitoring.
   * @param {string} executable the process name to monitor to unsubscribe
   * @param {string} uid a uid for the observer
   * @memberof ProcessMonitor
   */
  unsubscribe(executable: string, uid: string): void {
    if (!this.#observers.has(executable)) return;

    const observers = this.#observers.get(executable);

    if (!observers.has(uid)) return;

    const newObserverMap = new Map([...observers].filter(([obUid]) => obUid !== uid));

    // Remove observer and stop monitoring if there is no other observers
    if (newObserverMap.size === 0) {
      this.#observers.delete(executable);
      if (this.#observers.size === 0) this.#stop();
    } else {
      this.#observers.set(executable, newObserverMap);
    }
  }
}

export default ProcessMonitor;

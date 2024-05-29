/** Should match the PI possible actions */
type RouteAction = "NONE" | "RUN" | "RUNADMIN" | "FOCUS" | "CLOSE" | "KILL";

/** Should match the PI settings */
type Settings = {
  application: {
    path: string | null;
    executable: string | null;
    name: string | null;
  };
  arguments: string | null;
  singleInstance: boolean;
  windowStyle: "Normal" | "Maximized" | "Closed" | "Hidden";
  shortPressAction: RouteAction;
  doublePressAction: RouteAction;
  longPressAction: RouteAction;
  shortPressThreshold: number;
  longPressThreshold: number;
  monitor: boolean;
  icon: {
    off: string | null;
    on: string | null;
  };
};

export { Settings, RouteAction };

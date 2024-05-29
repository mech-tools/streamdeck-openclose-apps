import streamDeck, { LogLevel } from "@elgato/streamdeck";
import OpenClose from "./action";

/** Register the action and fire the plugin */
streamDeck.logger.setLevel(LogLevel.INFO);
streamDeck.actions.registerAction(new OpenClose());
streamDeck.connect();

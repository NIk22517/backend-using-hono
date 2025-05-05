import { EventEmitter } from "events";
import type { AppEvents } from "./eventTypes";
import { messageSentHandler } from "./handlers/messageSent.handler";

class TypedEventEmitter extends EventEmitter {
  emit<K extends keyof AppEvents>(
    event: K,
    payload: Parameters<AppEvents[K]>[0]
  ): boolean {
    return super.emit(event, payload);
  }

  on<K extends keyof AppEvents>(event: K, listener: AppEvents[K]): this {
    return super.on(event, listener);
  }
}

export const eventEmitter = new TypedEventEmitter();

// Listen for the event
eventEmitter.on("messageSent", (payload) => {
  messageSentHandler(payload);
});

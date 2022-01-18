import { EventEmitter } from "events";
export const enum CloudEvents {
  unbind = 'unbind',
  bind = 'bind',
}
export const cloudEvent = new EventEmitter();
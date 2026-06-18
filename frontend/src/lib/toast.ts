import { writable } from "svelte/store";

export const toastMsg = writable<string>("");
let t: any;
export function toast(msg: string) {
  toastMsg.set(msg);
  clearTimeout(t);
  t = setTimeout(() => toastMsg.set(""), 2400);
}

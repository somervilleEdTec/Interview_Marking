import type { InterviewAPI } from "../../electron/preload/index";

declare global {
  interface Window {
    interview: InterviewAPI;
  }
}

export {};

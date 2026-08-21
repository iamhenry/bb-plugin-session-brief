import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { SessionBriefHost } from "./components/session-brief/SessionBriefHost";

export default definePluginApp((app) => {
  app.slots.experimental_threadHeaderAction({
    id: "session-brief",
    title: "Session Brief",
    component: SessionBriefHost,
  });
});

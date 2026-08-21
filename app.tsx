import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { DirtyFilePanel } from "./components/session-brief/DirtyFilePanel";
import { SessionBriefHost } from "./components/session-brief/SessionBriefHost";

export default definePluginApp((app) => {
  app.slots.experimental_threadHeaderAction({
    id: "session-brief",
    title: "Session Brief",
    component: SessionBriefHost,
  });
  app.slots.threadPanelAction({
    id: "dirty-file",
    title: "File",
    icon: "File",
    layout: "flush",
    component: DirtyFilePanel,
  });
});

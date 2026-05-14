import { renderStudio } from "./render.js";
import { createInitialStudioState } from "./studio-state.js";

const root = globalThis.document?.getElementById("root");
if (root) {
  root.innerHTML = renderStudio(createInitialStudioState());
}

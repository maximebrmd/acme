import { defineMeta } from "blume";

// The Guides tab, in both languages: running a workspace, in the order the
// app's own navigation runs, each group labelled as the app labels it.
export default defineMeta({
  pages: ["index", "channels", "posts", "media", "engage", "workspace"],
});

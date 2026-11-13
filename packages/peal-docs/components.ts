import { defineComponents } from "blume";

// The docs' own pieces of Blume's chrome, by path from the project root
// (Blume reads this file without running it): the sidebar gains a button to
// the web app at its foot.
export default defineComponents({
  layout: { Sidebar: "./components/sidebar.astro" },
});

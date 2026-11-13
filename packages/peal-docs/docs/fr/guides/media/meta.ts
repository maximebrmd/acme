import { defineMeta } from "blume";

import { shared } from "../../../guides/media/meta.$.ts";

// A locale's own meta replaces the shared one: this keeps its order and
// changes the label.
export default defineMeta({
  ...shared,
  title: "Médias",
});

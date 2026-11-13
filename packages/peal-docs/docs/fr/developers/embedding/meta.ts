import { defineMeta } from "blume";

import { shared } from "../../../developers/embedding/meta.$.ts";

// A locale's own meta replaces the shared one: this keeps its order and
// changes the label.
export default defineMeta({
  ...shared,
  title: "Intégration",
});

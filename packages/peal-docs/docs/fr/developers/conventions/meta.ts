import { defineMeta } from "blume";

import { shared } from "../../../developers/conventions/meta.$.ts";

// A locale's own meta replaces the shared one: this keeps its order and
// changes the label.
export default defineMeta({
  ...shared,
  title: "Conventions de l’API",
});

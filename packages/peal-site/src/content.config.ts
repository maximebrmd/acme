import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

// Legal documents, one Markdown file per locale and document:
// legal/<locale>/<document>.md, so an entry's id is "<locale>/<document>".
const legal = defineCollection({
  loader: glob({ base: "./src/content/legal", pattern: "**/*.md" }),
  schema: z.object({
    description: z.string(),
    // A draft shows a banner saying it is pending legal review and is kept
    // out of search engines. Set it to false once the text is approved.
    draft: z.boolean(),
    title: z.string(),
  }),
});

export const collections = { legal };

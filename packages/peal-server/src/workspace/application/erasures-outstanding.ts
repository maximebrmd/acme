import { Schema } from "effect";

/**
 * A replay of the erasure ledger left erasures refused or entries
 * unreadable: the server must stay stopped until each is applied or
 * accounted for.
 */
export class ErasuresOutstanding extends Schema.TaggedError<ErasuresOutstanding>()(
  "ErasuresOutstanding",
  { refused: Schema.Int, unreadable: Schema.Int }
) {
  override get message(): string {
    return `${this.refused} erasures were refused and ${this.unreadable} objects of the ledger do not read: keep the server stopped until each is applied or accounted for`;
  }
}

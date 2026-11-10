/**
 * The return origins a form holds, one a line, as the API takes them:
 * without the spaces around each, nor the lines left empty.
 */
export const originsOf = (text: string): readonly string[] =>
  text.split("\n").flatMap((line) => {
    const origin = line.trim();

    return origin === "" ? [] : [origin];
  });

/** The origins an account has, as the form shows them: one a line. */
export const originsText = (origins: readonly string[]): string =>
  origins.join("\n");

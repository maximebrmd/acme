/**
 * Runs one action at a time: an action asked while another runs is
 * refused at once, not queued. It decides synchronously, so two clicks in
 * the same instant, before React renders anything disabled, still make one
 * request: a second "Publish now" would otherwise create and schedule the
 * post twice.
 */
export const oneAtATime = () => {
  let running = false;

  return {
    /** Runs `action` unless one runs, and says whether it did. */
    run: async (action: () => Promise<void>): Promise<boolean> => {
      if (running) {
        return false;
      }

      running = true;

      try {
        await action();
      } finally {
        running = false;
      }

      return true;
    },
  };
};

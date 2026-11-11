/**
 * How many events "send all failed again" sends again to an endpoint, of
 * the deliveries it lists: those whose last delivery failed, once each, as
 * the server picks them. A delivery sent again since, whatever became of
 * it, stands for the ones before.
 */
export const failedToSendAgain = (
  deliveries: readonly {
    readonly eventId: string;
    readonly id: string;
    readonly status: string;
  }[]
): number => {
  const last = new Map<
    string,
    { readonly id: string; readonly status: string }
  >();

  for (const delivery of deliveries) {
    const known = last.get(delivery.eventId);

    if (known === undefined || known.id < delivery.id) {
      last.set(delivery.eventId, delivery);
    }
  }

  return [...last.values()].filter(({ status }) => status === "failed").length;
};

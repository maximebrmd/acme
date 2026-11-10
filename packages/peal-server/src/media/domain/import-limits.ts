/**
 * How many imports run at once: two a workspace, so one member's script
 * cannot have the server fetch a dozen files of the plan's whole room
 * together, and eight a server, each holding a part of its file (8 MiB)
 * and a connection for up to the import's time. Past either, an import is
 * refused at once, to be asked again in a moment.
 */
export const importsAtOnce = { perServer: 8, perWorkspace: 2 } as const;

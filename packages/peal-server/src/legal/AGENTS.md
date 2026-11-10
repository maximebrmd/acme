# Legal records (legal)

- Peal Cloud is a host under French law (loi n° 2004-575, art. 6, I, 2
  now names the DSA's hosting services, which store what users give them,
  public or not), so it keeps what identifies whoever contributed content
  (art. 6, V, A; décret n° 2021-1362), in the `legal` context and its own
  Postgres schema, which no other code reads. `ConnectionJournal`
  (`workspace/application`, backed by `LegalRecords`) keeps each request
  that changes posts or media and succeeds, whatever authenticated it
  (`Authentication`, both paths, and `mcpAuthentication` for the MCP tools
  that change posts, which `app/mcp/server.ts` names from their
  annotations): when, the address as Better Auth reads it (full IPv6), the
  protocol of `PUBLIC_URL` and how it signed in, never what it carried, 1
  year. `CloseAccount` reads `AccountStore.identification` (name, email,
  each sign-in method's account id, never a password or its hash, the Stripe
  customers of the account and of the workspaces it deletes) before it
  erases anything, and keeps it (`ContextRecords.holdIdentification`) in
  the same transaction, last: no account closes without it, and nothing
  else of it stays. The `legal.retention` cron (`PurgeLegalRecords`) empties
  how they signed in and paid after 1 year, deletes the rest after 5, each
  connection after 1, and each answer to a legal request after 5
  (`legal/domain/legal-retention.ts`). Only `LegalRequests` reads them,
  for staff who also hold the legal role (`legal` beside `admin` in Better
  Auth's comma-separated `role`, `LegalOfficers` from `StaffStanding`;
  other staff get 404 too) (`POST /api/admin/legal-requests`, `LegalApi`,
  StaffAccess), recording the answer (staff, authority, reference, legal
  basis, subject, what it covers, counts) in the transaction that reads
  it, and in the staff audit log (`legalDisclosure`, through the staff
  context's `LegalDisclosureAudit`), so the rest of staff see it. A
  request names what it asks for (`covers`: identity, signIn, payments,
  connections, and the connections' period), and the answer holds nothing
  else (`disclosedOf`, `legal/domain/legal-scope.ts`): a category not
  covered is null. `GET …/legal-requests` lists the answers given, never
  what was handed over, and `…/standing` tells the console who answers
  them. The export carries the user's connections
  and what closing would leave (`legalHold`). The software keeps none of
  it unless `PEAL_LEGAL_RETENTION=true`: only an operator the law obliges
  may hold it (GDPR minimisation), so the default is off
  (`LegalRecords.layerOff`: nothing is written to the `legal` schema, and
  `legalHold` is null), and `peal-infra` turns it on for Peal's servers
  (`peal_legal_retention`). A server that turns it off after it was on
  keeps what it holds until its term: the purge cron and `LegalRequests`
  run whatever the setting, and `legalHold` still lists the connections
  held. A new way to change content (a group, a tool) goes through the
  journal too.

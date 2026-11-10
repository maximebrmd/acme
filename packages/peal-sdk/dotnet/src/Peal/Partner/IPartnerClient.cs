namespace Peal;

public partial interface IPartnerClient
{
    /// <summary>
    /// The partner account the key belongs to, with what it holds: the workspaces it owns and the channels connected across them and its home workspace, now and at the end of each of the last 35 days (UTC). Takes a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
    /// </summary>
    WithRawResponseTask<PartnerOverview> AccountAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the workspaces the partner owns, newest first, each with the number of channels connected in it, 50 a page unless `limit` (at most 100) says otherwise. `externalId` finds the one workspace with that external id, exactly; `name` those whose name holds the text, whatever its case. `total` counts what the filters find; pass the page's `next` as `before` for the next page. Needs the scope workspaces:read. Takes a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
    /// </summary>
    WithRawResponseTask<CustomerWorkspacePage> ListWorkspacesAsync(
        ListWorkspacesPartnerRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates a workspace for one of the partner's customers: it has no members, shares the plan of the partner's home workspace, and the partner's keys act in it. `externalId`, the partner's own id for its customer, is unique among the partner's workspaces: a second workspace with it answers 409 `ExternalIdTaken` with the id of the one that has it, so a creation sent twice never makes two. Send an `Idempotency-Key` header (any text of your choosing, at most 255 characters, such as a UUID) to make a request safe to send again: within 24 hours, the same key with the same body answers the workspace the first request made, as it now stands, and makes no other; the same key with another body is refused (`IdempotencyKeyReused`), and answers `WorkspaceNotFound` once that workspace was deleted. Keys are kept per partner, as digests. Needs the scope workspaces:write. Takes a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
    /// </summary>
    WithRawResponseTask<CustomerWorkspace> CreateWorkspaceAsync(
        NewCustomerWorkspace request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// One workspace the partner owns, with the number of channels connected in it. A workspace of anyone else answers 404, as one that does not exist. Needs the scope workspaces:read. Takes a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
    /// </summary>
    WithRawResponseTask<CustomerWorkspace> GetWorkspaceAsync(
        GetWorkspacePartnerRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Offboards a customer: deletes the workspace and everything in it, for good, as deleting a workspace does for its owner: its channels and their tokens (revoked at the platforms that take it, when no other workspace connects the same account), its posts, scheduled ones included, which then go out nowhere, its media and their files, its analytics, its webhook endpoints and their logs, its connect links. It cannot be undone. Answers 409 while a post of the workspace is being published (`WorkspaceBusy`): send it again a moment later. The deletion is recorded by id in the object store before it is done, so that a restored backup deletes the workspace again; when the store cannot be reached, nothing is deleted (503 `MediaStoreUnavailable`). Only a workspace the partner owns: any other answers 404. Needs the scope workspaces:delete. Takes a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
    /// </summary>
    WithRawResponseTask DeleteWorkspaceAsync(
        DeleteWorkspacePartnerRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes a workspace's name or external id: what is left out stays as it is, and a null `externalId` removes it. An external id another of the partner's workspaces has answers 409 `ExternalIdTaken`. Needs the scope workspaces:write. Takes a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
    /// </summary>
    WithRawResponseTask<CustomerWorkspace> UpdateWorkspaceAsync(
        CustomerWorkspaceChange request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}

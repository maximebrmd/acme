namespace Peal;

public partial interface IInvitationsClient
{
    /// <summary>
    /// Lists the workspace's pending invitations, oldest first, expired ones included. Needs invitation:create, as an invitation's id opens its link, and a member rather than an API key; invitations to the owner role are listed to owners only.
    /// </summary>
    WithRawResponseTask<IEnumerable<Invitation>> ListAsync(
        ListInvitationsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Invites someone to the workspace with a role: Peal emails them a link that works for 7 days, in their language when they have an account, in the inviter's otherwise. A pending invitation to the same address is revoked, and its link stops working. Only owners invite owners. On a server that bills, the members and the other pending invitations must leave room in the workspace's plan (PlanLimitReached). Needs invitation:create, and a member in person: not an API key, nor staff impersonating one.
    /// </summary>
    WithRawResponseTask<Invitation> CreateAsync(
        NewInvitation request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Revokes a pending invitation of the workspace: its link stops working at once. Needs invitation:cancel, and a member in person: not an API key, nor staff impersonating one.
    /// </summary>
    WithRawResponseTask RevokeAsync(
        RevokeInvitationsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}

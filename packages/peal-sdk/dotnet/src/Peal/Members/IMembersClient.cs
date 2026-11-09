namespace Peal;

public partial interface IMembersClient
{
    /// <summary>
    /// Lists the workspace's members, in the order they joined, with their name, email address and role. Every member may see them, as the workspace's settings show them; an API key may not, as members' addresses are not a script's to read.
    /// </summary>
    WithRawResponseTask<IEnumerable<WorkspaceMember>> ListAsync(
        ListMembersRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}

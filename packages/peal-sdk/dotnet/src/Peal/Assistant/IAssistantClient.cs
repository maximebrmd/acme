namespace Peal;

public partial interface IAssistantClient
{
    /// <summary>
    /// Tells whether the server has a language model, so clients show the assistant or hide it, and how many requests the workspace has left today. Needs assistant:use.
    /// </summary>
    WithRawResponseTask<AssistantStatus> StatusAsync(
        StatusAssistantRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asks the language model to rewrite, shorten or translate a post's text, to suggest hashtags for it, or to write a first post from a subject (`write`), and answers once the whole suggestion is checked. The text is sent to the model as data, never as instructions. Each request counts toward the workspace's daily quota, unless the model's provider could not be reached. Needs assistant:use.
    /// </summary>
    WithRawResponseTask<Suggestion> SuggestAsync(
        SuggestionRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}

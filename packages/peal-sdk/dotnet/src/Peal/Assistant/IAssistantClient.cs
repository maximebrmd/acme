namespace Peal;

public partial interface IAssistantClient
{
    /// <summary>
    /// Tells whether the server has a language model, so clients show the assistant or hide it, whether it has an image model (`images`), and how many requests the workspace has left today. Needs assistant:use.
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

    /// <summary>
    /// Asks the server's image model for one image from the prompt, in the aspect asked for, and answers with it as a new file of the media library, ready to attach, marked `aiGenerated` and without a description. The prompt is sent to the image provider the server's operator chose; neither it nor the image is logged. An image costs the status's `images.requestCost` of the workspace's daily requests, given back only when the provider could not be reached, and takes room in the plan's media storage, which must hold the largest image before anything is spent. The file is stored as the provider gave it. Peal sets no platform's AI label on its own: set it in the post's options (YouTube `containsSyntheticMedia`, TikTok `aiGenerated`, X `madeWithAi`). Needs assistant:use and media:upload. Off unless the server has an image model.
    /// </summary>
    WithRawResponseTask<Media> GenerateImageAsync(
        ImageRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}

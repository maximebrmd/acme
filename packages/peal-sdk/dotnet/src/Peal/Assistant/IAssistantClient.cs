namespace Peal;

public partial interface IAssistantClient
{
    /// <summary>
    /// Tells whether the server has a language model, so clients show the assistant or hide it, who makes the workspace's images (`images.source`: the workspace's own provider, the server's image model, or nobody) and what one costs, and how many requests the workspace has left today. Needs assistant:use.
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
    /// Asks for one image from the prompt, in the aspect asked for, and answers with it as a new file of the media library, ready to attach, marked `aiGenerated` and without a description. When the workspace brought its own image provider, the prompt goes there, with the workspace's key, and the image costs none of the workspace's daily requests, on any plan, a trial and the free plan included; if that provider refuses, the answer is ImageProviderRefused and the server's model is never asked instead. Otherwise the prompt goes to the image provider the server's operator chose, and an image costs the status's `images.requestCost` of the workspace's daily requests, given back only when the provider could not be reached. Neither the prompt nor the image is logged. Either way the image takes room in the plan's media storage, which must hold the largest image before anything is asked. The file is stored as the provider gave it. Peal sets no platform's AI label on its own: set it in the post's options (YouTube `containsSyntheticMedia`, TikTok `aiGenerated`, X `madeWithAi`). Needs assistant:use and media:upload. Off unless the workspace brought a provider or the server has an image model (`images.source`).
    /// </summary>
    WithRawResponseTask<Media> GenerateImageAsync(
        ImageRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Reads the image provider the workspace brought, an endpoint that speaks the OpenAI images API (`POST {baseUrl}/images/generations`), whose images then spend none of the workspace's daily assistant requests: its address and model, never its key, or null. Needs assistant:configure.
    /// </summary>
    WithRawResponseTask<ImageProviderSetting> ImageProviderAsync(
        ImageProviderAssistantRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sets the image provider the workspace brings, an endpoint that speaks the OpenAI images API (`POST {baseUrl}/images/generations`), whose images then spend none of the workspace's daily assistant requests. The workspace's image prompts then go to `baseUrl` with `apiKey` as a bearer token; the images still take room in the plan's media storage. Peal keeps the key encrypted for this workspace and this address's origin, never shows it again, and never sends it to another origin: `apiKey` may be left out to keep the stored one while the origin stays the same. The address must be public HTTPS; it is checked now, and before every call. The provider is not called: the first image tells whether the settings work. Needs assistant:configure.
    /// </summary>
    WithRawResponseTask<ImageProvider> SetImageProviderAsync(
        ImageProviderChange request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Removes the workspace's image provider and its key: images are made by the server's image model again, if it has one, and cost the workspace's daily requests. Needs assistant:configure.
    /// </summary>
    WithRawResponseTask RemoveImageProviderAsync(
        RemoveImageProviderAssistantRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}

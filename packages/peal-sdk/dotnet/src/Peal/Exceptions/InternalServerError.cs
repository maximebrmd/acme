namespace Peal;

/// <summary>
/// This exception type will be thrown for any non-2XX API responses.
/// </summary>
[Serializable]
public class InternalServerError(
    DeletionIncompleteEncoded body,
    Peal.RawResponse? rawResponse = null
) : PealClientApiException("InternalServerError", 500, body, rawResponse: rawResponse)
{
    /// <summary>
    /// The body of the response that triggered the exception.
    /// </summary>
    public new DeletionIncompleteEncoded Body => body;
}

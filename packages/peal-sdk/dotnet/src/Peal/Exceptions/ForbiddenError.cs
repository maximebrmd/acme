namespace Peal;

/// <summary>
/// This exception type will be thrown for any non-2XX API responses.
/// </summary>
[Serializable]
public class ForbiddenError(ForbiddenEncoded body, Peal.RawResponse? rawResponse = null)
    : PealClientApiException("ForbiddenError", 403, body, rawResponse: rawResponse)
{
    /// <summary>
    /// The body of the response that triggered the exception.
    /// </summary>
    public new ForbiddenEncoded Body => body;
}

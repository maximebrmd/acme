namespace Peal;

/// <summary>
/// This exception type will be thrown for any non-2XX API responses.
/// </summary>
[Serializable]
public class UnauthorizedError(UnauthenticatedEncoded body, Peal.RawResponse? rawResponse = null)
    : PealClientApiException("UnauthorizedError", 401, body, rawResponse: rawResponse)
{
    /// <summary>
    /// The body of the response that triggered the exception.
    /// </summary>
    public new UnauthenticatedEncoded Body => body;
}

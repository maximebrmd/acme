namespace Peal;

/// <summary>
/// This exception type will be thrown for any non-2XX API responses.
/// </summary>
[Serializable]
public class ConflictError(object body, Peal.RawResponse? rawResponse = null)
    : PealClientApiException("ConflictError", 409, body, rawResponse: rawResponse);

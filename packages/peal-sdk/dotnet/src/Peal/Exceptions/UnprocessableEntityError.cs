namespace Peal;

/// <summary>
/// This exception type will be thrown for any non-2XX API responses.
/// </summary>
[Serializable]
public class UnprocessableEntityError(object body, Peal.RawResponse? rawResponse = null)
    : PealClientApiException("UnprocessableEntityError", 422, body, rawResponse: rawResponse);

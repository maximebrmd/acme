using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(
    typeof(TooManyWebhookEndpointsEncodedTag.TooManyWebhookEndpointsEncodedTagSerializer)
)]
[Serializable]
public readonly record struct TooManyWebhookEndpointsEncodedTag : IStringEnum
{
    public static readonly TooManyWebhookEndpointsEncodedTag TooManyWebhookEndpoints = new(
        Values.TooManyWebhookEndpoints
    );

    public TooManyWebhookEndpointsEncodedTag(string value)
    {
        Value = value;
    }

    /// <summary>
    /// The string value of the enum.
    /// </summary>
    public string Value { get; }

    /// <summary>
    /// Create a string enum with the given value.
    /// </summary>
    public static TooManyWebhookEndpointsEncodedTag FromCustom(string value)
    {
        return new TooManyWebhookEndpointsEncodedTag(value);
    }

    public bool Equals(string? other)
    {
        return Value.Equals(other);
    }

    /// <summary>
    /// Returns the string value of the enum.
    /// </summary>
    public override string ToString()
    {
        return Value;
    }

    public static bool operator ==(TooManyWebhookEndpointsEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TooManyWebhookEndpointsEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TooManyWebhookEndpointsEncodedTag value) => value.Value;

    public static explicit operator TooManyWebhookEndpointsEncodedTag(string value) => new(value);

    internal class TooManyWebhookEndpointsEncodedTagSerializer
        : JsonConverter<TooManyWebhookEndpointsEncodedTag>
    {
        public override TooManyWebhookEndpointsEncodedTag Read(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new global::System.Exception(
                    "The JSON value could not be read as a string."
                );
            return new TooManyWebhookEndpointsEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TooManyWebhookEndpointsEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TooManyWebhookEndpointsEncodedTag ReadAsPropertyName(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new global::System.Exception(
                    "The JSON property name could not be read as a string."
                );
            return new TooManyWebhookEndpointsEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TooManyWebhookEndpointsEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Value);
        }
    }

    /// <summary>
    /// Constant strings for enum values
    /// </summary>
    [Serializable]
    public static class Values
    {
        public const string TooManyWebhookEndpoints = "TooManyWebhookEndpoints";
    }
}

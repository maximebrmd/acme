using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(WebhookTurnOffReason.WebhookTurnOffReasonSerializer))]
[Serializable]
public readonly record struct WebhookTurnOffReason : IStringEnum
{
    public static readonly WebhookTurnOffReason Failing = new(Values.Failing);

    public static readonly WebhookTurnOffReason Gone = new(Values.Gone);

    public WebhookTurnOffReason(string value)
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
    public static WebhookTurnOffReason FromCustom(string value)
    {
        return new WebhookTurnOffReason(value);
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

    public static bool operator ==(WebhookTurnOffReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WebhookTurnOffReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WebhookTurnOffReason value) => value.Value;

    public static explicit operator WebhookTurnOffReason(string value) => new(value);

    internal class WebhookTurnOffReasonSerializer : JsonConverter<WebhookTurnOffReason>
    {
        public override WebhookTurnOffReason Read(
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
            return new WebhookTurnOffReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WebhookTurnOffReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WebhookTurnOffReason ReadAsPropertyName(
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
            return new WebhookTurnOffReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WebhookTurnOffReason value,
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
        public const string Failing = "failing";

        public const string Gone = "gone";
    }
}

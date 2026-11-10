using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(WebhookDeliveryStatus.WebhookDeliveryStatusSerializer))]
[Serializable]
public readonly record struct WebhookDeliveryStatus : IStringEnum
{
    public static readonly WebhookDeliveryStatus Pending = new(Values.Pending);

    public static readonly WebhookDeliveryStatus Succeeded = new(Values.Succeeded);

    public static readonly WebhookDeliveryStatus Failed = new(Values.Failed);

    public WebhookDeliveryStatus(string value)
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
    public static WebhookDeliveryStatus FromCustom(string value)
    {
        return new WebhookDeliveryStatus(value);
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

    public static bool operator ==(WebhookDeliveryStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WebhookDeliveryStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WebhookDeliveryStatus value) => value.Value;

    public static explicit operator WebhookDeliveryStatus(string value) => new(value);

    internal class WebhookDeliveryStatusSerializer : JsonConverter<WebhookDeliveryStatus>
    {
        public override WebhookDeliveryStatus Read(
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
            return new WebhookDeliveryStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WebhookDeliveryStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WebhookDeliveryStatus ReadAsPropertyName(
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
            return new WebhookDeliveryStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WebhookDeliveryStatus value,
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
        public const string Pending = "pending";

        public const string Succeeded = "succeeded";

        public const string Failed = "failed";
    }
}

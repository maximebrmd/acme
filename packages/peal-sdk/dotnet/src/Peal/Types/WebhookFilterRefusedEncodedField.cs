using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(WebhookFilterRefusedEncodedField.WebhookFilterRefusedEncodedFieldSerializer))]
[Serializable]
public readonly record struct WebhookFilterRefusedEncodedField : IStringEnum
{
    public static readonly WebhookFilterRefusedEncodedField ChannelIds = new(Values.ChannelIds);

    public static readonly WebhookFilterRefusedEncodedField WorkspaceIds = new(Values.WorkspaceIds);

    public WebhookFilterRefusedEncodedField(string value)
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
    public static WebhookFilterRefusedEncodedField FromCustom(string value)
    {
        return new WebhookFilterRefusedEncodedField(value);
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

    public static bool operator ==(WebhookFilterRefusedEncodedField value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WebhookFilterRefusedEncodedField value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WebhookFilterRefusedEncodedField value) => value.Value;

    public static explicit operator WebhookFilterRefusedEncodedField(string value) => new(value);

    internal class WebhookFilterRefusedEncodedFieldSerializer
        : JsonConverter<WebhookFilterRefusedEncodedField>
    {
        public override WebhookFilterRefusedEncodedField Read(
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
            return new WebhookFilterRefusedEncodedField(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WebhookFilterRefusedEncodedField value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WebhookFilterRefusedEncodedField ReadAsPropertyName(
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
            return new WebhookFilterRefusedEncodedField(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WebhookFilterRefusedEncodedField value,
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
        public const string ChannelIds = "channelIds";

        public const string WorkspaceIds = "workspaceIds";
    }
}

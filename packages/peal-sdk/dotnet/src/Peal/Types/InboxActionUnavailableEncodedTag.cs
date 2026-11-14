using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(InboxActionUnavailableEncodedTag.InboxActionUnavailableEncodedTagSerializer))]
[Serializable]
public readonly record struct InboxActionUnavailableEncodedTag : IStringEnum
{
    public static readonly InboxActionUnavailableEncodedTag InboxActionUnavailable = new(
        Values.InboxActionUnavailable
    );

    public InboxActionUnavailableEncodedTag(string value)
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
    public static InboxActionUnavailableEncodedTag FromCustom(string value)
    {
        return new InboxActionUnavailableEncodedTag(value);
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

    public static bool operator ==(InboxActionUnavailableEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxActionUnavailableEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxActionUnavailableEncodedTag value) => value.Value;

    public static explicit operator InboxActionUnavailableEncodedTag(string value) => new(value);

    internal class InboxActionUnavailableEncodedTagSerializer
        : JsonConverter<InboxActionUnavailableEncodedTag>
    {
        public override InboxActionUnavailableEncodedTag Read(
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
            return new InboxActionUnavailableEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxActionUnavailableEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxActionUnavailableEncodedTag ReadAsPropertyName(
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
            return new InboxActionUnavailableEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxActionUnavailableEncodedTag value,
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
        public const string InboxActionUnavailable = "InboxActionUnavailable";
    }
}

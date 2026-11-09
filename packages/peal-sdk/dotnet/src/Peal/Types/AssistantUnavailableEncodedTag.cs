using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AssistantUnavailableEncodedTag.AssistantUnavailableEncodedTagSerializer))]
[Serializable]
public readonly record struct AssistantUnavailableEncodedTag : IStringEnum
{
    public static readonly AssistantUnavailableEncodedTag AssistantUnavailable = new(
        Values.AssistantUnavailable
    );

    public AssistantUnavailableEncodedTag(string value)
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
    public static AssistantUnavailableEncodedTag FromCustom(string value)
    {
        return new AssistantUnavailableEncodedTag(value);
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

    public static bool operator ==(AssistantUnavailableEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AssistantUnavailableEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AssistantUnavailableEncodedTag value) => value.Value;

    public static explicit operator AssistantUnavailableEncodedTag(string value) => new(value);

    internal class AssistantUnavailableEncodedTagSerializer
        : JsonConverter<AssistantUnavailableEncodedTag>
    {
        public override AssistantUnavailableEncodedTag Read(
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
            return new AssistantUnavailableEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AssistantUnavailableEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AssistantUnavailableEncodedTag ReadAsPropertyName(
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
            return new AssistantUnavailableEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AssistantUnavailableEncodedTag value,
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
        public const string AssistantUnavailable = "AssistantUnavailable";
    }
}

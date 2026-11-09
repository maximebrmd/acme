using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AssistantFailedEncodedTag.AssistantFailedEncodedTagSerializer))]
[Serializable]
public readonly record struct AssistantFailedEncodedTag : IStringEnum
{
    public static readonly AssistantFailedEncodedTag AssistantFailed = new(Values.AssistantFailed);

    public AssistantFailedEncodedTag(string value)
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
    public static AssistantFailedEncodedTag FromCustom(string value)
    {
        return new AssistantFailedEncodedTag(value);
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

    public static bool operator ==(AssistantFailedEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AssistantFailedEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AssistantFailedEncodedTag value) => value.Value;

    public static explicit operator AssistantFailedEncodedTag(string value) => new(value);

    internal class AssistantFailedEncodedTagSerializer : JsonConverter<AssistantFailedEncodedTag>
    {
        public override AssistantFailedEncodedTag Read(
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
            return new AssistantFailedEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AssistantFailedEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AssistantFailedEncodedTag ReadAsPropertyName(
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
            return new AssistantFailedEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AssistantFailedEncodedTag value,
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
        public const string AssistantFailed = "AssistantFailed";
    }
}

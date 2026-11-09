using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AssistantInputRejectedEncodedTag.AssistantInputRejectedEncodedTagSerializer))]
[Serializable]
public readonly record struct AssistantInputRejectedEncodedTag : IStringEnum
{
    public static readonly AssistantInputRejectedEncodedTag AssistantInputRejected = new(
        Values.AssistantInputRejected
    );

    public AssistantInputRejectedEncodedTag(string value)
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
    public static AssistantInputRejectedEncodedTag FromCustom(string value)
    {
        return new AssistantInputRejectedEncodedTag(value);
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

    public static bool operator ==(AssistantInputRejectedEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AssistantInputRejectedEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AssistantInputRejectedEncodedTag value) => value.Value;

    public static explicit operator AssistantInputRejectedEncodedTag(string value) => new(value);

    internal class AssistantInputRejectedEncodedTagSerializer
        : JsonConverter<AssistantInputRejectedEncodedTag>
    {
        public override AssistantInputRejectedEncodedTag Read(
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
            return new AssistantInputRejectedEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AssistantInputRejectedEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AssistantInputRejectedEncodedTag ReadAsPropertyName(
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
            return new AssistantInputRejectedEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AssistantInputRejectedEncodedTag value,
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
        public const string AssistantInputRejected = "AssistantInputRejected";
    }
}

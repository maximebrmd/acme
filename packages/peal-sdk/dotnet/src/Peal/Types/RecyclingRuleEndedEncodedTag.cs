using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(RecyclingRuleEndedEncodedTag.RecyclingRuleEndedEncodedTagSerializer))]
[Serializable]
public readonly record struct RecyclingRuleEndedEncodedTag : IStringEnum
{
    public static readonly RecyclingRuleEndedEncodedTag RecyclingRuleEnded = new(
        Values.RecyclingRuleEnded
    );

    public RecyclingRuleEndedEncodedTag(string value)
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
    public static RecyclingRuleEndedEncodedTag FromCustom(string value)
    {
        return new RecyclingRuleEndedEncodedTag(value);
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

    public static bool operator ==(RecyclingRuleEndedEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RecyclingRuleEndedEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RecyclingRuleEndedEncodedTag value) => value.Value;

    public static explicit operator RecyclingRuleEndedEncodedTag(string value) => new(value);

    internal class RecyclingRuleEndedEncodedTagSerializer
        : JsonConverter<RecyclingRuleEndedEncodedTag>
    {
        public override RecyclingRuleEndedEncodedTag Read(
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
            return new RecyclingRuleEndedEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RecyclingRuleEndedEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RecyclingRuleEndedEncodedTag ReadAsPropertyName(
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
            return new RecyclingRuleEndedEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RecyclingRuleEndedEncodedTag value,
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
        public const string RecyclingRuleEnded = "RecyclingRuleEnded";
    }
}

using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(CommentRuleOutcome.CommentRuleOutcomeSerializer))]
[Serializable]
public readonly record struct CommentRuleOutcome : IStringEnum
{
    public static readonly CommentRuleOutcome Claimed = new(Values.Claimed);

    public static readonly CommentRuleOutcome Replied = new(Values.Replied);

    public static readonly CommentRuleOutcome SamePerson = new(Values.SamePerson);

    public static readonly CommentRuleOutcome Refused = new(Values.Refused);

    public CommentRuleOutcome(string value)
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
    public static CommentRuleOutcome FromCustom(string value)
    {
        return new CommentRuleOutcome(value);
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

    public static bool operator ==(CommentRuleOutcome value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CommentRuleOutcome value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CommentRuleOutcome value) => value.Value;

    public static explicit operator CommentRuleOutcome(string value) => new(value);

    internal class CommentRuleOutcomeSerializer : JsonConverter<CommentRuleOutcome>
    {
        public override CommentRuleOutcome Read(
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
            return new CommentRuleOutcome(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CommentRuleOutcome value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CommentRuleOutcome ReadAsPropertyName(
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
            return new CommentRuleOutcome(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CommentRuleOutcome value,
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
        public const string Claimed = "claimed";

        public const string Replied = "replied";

        public const string SamePerson = "samePerson";

        public const string Refused = "refused";
    }
}

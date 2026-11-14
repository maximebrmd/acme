using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(CommentRuleAbility.CommentRuleAbilitySerializer))]
[Serializable]
public readonly record struct CommentRuleAbility : IStringEnum
{
    public static readonly CommentRuleAbility Available = new(Values.Available);

    public static readonly CommentRuleAbility NoApi = new(Values.NoApi);

    public static readonly CommentRuleAbility NotAllowed = new(Values.NotAllowed);

    public static readonly CommentRuleAbility Unsupported = new(Values.Unsupported);

    public static readonly CommentRuleAbility Reconnect = new(Values.Reconnect);

    public static readonly CommentRuleAbility TextTooLong = new(Values.TextTooLong);

    public CommentRuleAbility(string value)
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
    public static CommentRuleAbility FromCustom(string value)
    {
        return new CommentRuleAbility(value);
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

    public static bool operator ==(CommentRuleAbility value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CommentRuleAbility value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CommentRuleAbility value) => value.Value;

    public static explicit operator CommentRuleAbility(string value) => new(value);

    internal class CommentRuleAbilitySerializer : JsonConverter<CommentRuleAbility>
    {
        public override CommentRuleAbility Read(
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
            return new CommentRuleAbility(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CommentRuleAbility value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CommentRuleAbility ReadAsPropertyName(
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
            return new CommentRuleAbility(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CommentRuleAbility value,
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
        public const string Available = "available";

        public const string NoApi = "noApi";

        public const string NotAllowed = "notAllowed";

        public const string Unsupported = "unsupported";

        public const string Reconnect = "reconnect";

        public const string TextTooLong = "textTooLong";
    }
}

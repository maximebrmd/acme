using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(CommentRuleRefusal.CommentRuleRefusalSerializer))]
[Serializable]
public readonly record struct CommentRuleRefusal : IStringEnum
{
    public static readonly CommentRuleRefusal Keywords = new(Values.Keywords);

    public static readonly CommentRuleRefusal EmptyReply = new(Values.EmptyReply);

    public static readonly CommentRuleRefusal NoChannel = new(Values.NoChannel);

    public static readonly CommentRuleRefusal Channels = new(Values.Channels);

    public CommentRuleRefusal(string value)
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
    public static CommentRuleRefusal FromCustom(string value)
    {
        return new CommentRuleRefusal(value);
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

    public static bool operator ==(CommentRuleRefusal value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CommentRuleRefusal value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CommentRuleRefusal value) => value.Value;

    public static explicit operator CommentRuleRefusal(string value) => new(value);

    internal class CommentRuleRefusalSerializer : JsonConverter<CommentRuleRefusal>
    {
        public override CommentRuleRefusal Read(
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
            return new CommentRuleRefusal(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CommentRuleRefusal value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CommentRuleRefusal ReadAsPropertyName(
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
            return new CommentRuleRefusal(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CommentRuleRefusal value,
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
        public const string Keywords = "keywords";

        public const string EmptyReply = "emptyReply";

        public const string NoChannel = "noChannel";

        public const string Channels = "channels";
    }
}

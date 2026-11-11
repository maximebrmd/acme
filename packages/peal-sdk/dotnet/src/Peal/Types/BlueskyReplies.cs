using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(BlueskyReplies.BlueskyRepliesSerializer))]
[Serializable]
public readonly record struct BlueskyReplies : IStringEnum
{
    public static readonly BlueskyReplies Everyone = new(Values.Everyone);

    public static readonly BlueskyReplies Nobody = new(Values.Nobody);

    public static readonly BlueskyReplies Limited = new(Values.Limited);

    public BlueskyReplies(string value)
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
    public static BlueskyReplies FromCustom(string value)
    {
        return new BlueskyReplies(value);
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

    public static bool operator ==(BlueskyReplies value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BlueskyReplies value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BlueskyReplies value) => value.Value;

    public static explicit operator BlueskyReplies(string value) => new(value);

    internal class BlueskyRepliesSerializer : JsonConverter<BlueskyReplies>
    {
        public override BlueskyReplies Read(
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
            return new BlueskyReplies(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BlueskyReplies value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BlueskyReplies ReadAsPropertyName(
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
            return new BlueskyReplies(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BlueskyReplies value,
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
        public const string Everyone = "everyone";

        public const string Nobody = "nobody";

        public const string Limited = "limited";
    }
}

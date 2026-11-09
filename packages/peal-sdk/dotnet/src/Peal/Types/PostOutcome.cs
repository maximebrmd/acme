using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PostOutcome.PostOutcomeSerializer))]
[Serializable]
public readonly record struct PostOutcome : IStringEnum
{
    public static readonly PostOutcome Published = new(Values.Published);

    public static readonly PostOutcome PartiallyPublished = new(Values.PartiallyPublished);

    public static readonly PostOutcome Unconfirmed = new(Values.Unconfirmed);

    public static readonly PostOutcome Failed = new(Values.Failed);

    public static readonly PostOutcome Cancelled = new(Values.Cancelled);

    public PostOutcome(string value)
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
    public static PostOutcome FromCustom(string value)
    {
        return new PostOutcome(value);
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

    public static bool operator ==(PostOutcome value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(PostOutcome value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(PostOutcome value) => value.Value;

    public static explicit operator PostOutcome(string value) => new(value);

    internal class PostOutcomeSerializer : JsonConverter<PostOutcome>
    {
        public override PostOutcome Read(
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
            return new PostOutcome(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PostOutcome value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PostOutcome ReadAsPropertyName(
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
            return new PostOutcome(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PostOutcome value,
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
        public const string Published = "published";

        public const string PartiallyPublished = "partiallyPublished";

        public const string Unconfirmed = "unconfirmed";

        public const string Failed = "failed";

        public const string Cancelled = "cancelled";
    }
}

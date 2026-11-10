using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ReviewParty.ReviewPartySerializer))]
[Serializable]
public readonly record struct ReviewParty : IStringEnum
{
    public static readonly ReviewParty Member = new(Values.Member);

    public static readonly ReviewParty Visitor = new(Values.Visitor);

    public static readonly ReviewParty Application = new(Values.Application);

    public ReviewParty(string value)
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
    public static ReviewParty FromCustom(string value)
    {
        return new ReviewParty(value);
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

    public static bool operator ==(ReviewParty value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReviewParty value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReviewParty value) => value.Value;

    public static explicit operator ReviewParty(string value) => new(value);

    internal class ReviewPartySerializer : JsonConverter<ReviewParty>
    {
        public override ReviewParty Read(
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
            return new ReviewParty(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReviewParty value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReviewParty ReadAsPropertyName(
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
            return new ReviewParty(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReviewParty value,
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
        public const string Member = "member";

        public const string Visitor = "visitor";

        public const string Application = "application";
    }
}

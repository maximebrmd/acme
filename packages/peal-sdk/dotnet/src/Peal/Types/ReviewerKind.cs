using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ReviewerKind.ReviewerKindSerializer))]
[Serializable]
public readonly record struct ReviewerKind : IStringEnum
{
    public static readonly ReviewerKind Member = new(Values.Member);

    public static readonly ReviewerKind ApiKey = new(Values.ApiKey);

    public static readonly ReviewerKind Visitor = new(Values.Visitor);

    public ReviewerKind(string value)
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
    public static ReviewerKind FromCustom(string value)
    {
        return new ReviewerKind(value);
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

    public static bool operator ==(ReviewerKind value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReviewerKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReviewerKind value) => value.Value;

    public static explicit operator ReviewerKind(string value) => new(value);

    internal class ReviewerKindSerializer : JsonConverter<ReviewerKind>
    {
        public override ReviewerKind Read(
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
            return new ReviewerKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReviewerKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReviewerKind ReadAsPropertyName(
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
            return new ReviewerKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReviewerKind value,
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

        public const string ApiKey = "apiKey";

        public const string Visitor = "visitor";
    }
}

using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ReviewLinkAccess.ReviewLinkAccessSerializer))]
[Serializable]
public readonly record struct ReviewLinkAccess : IStringEnum
{
    public static readonly ReviewLinkAccess View = new(Values.View);

    public static readonly ReviewLinkAccess Comment = new(Values.Comment);

    public static readonly ReviewLinkAccess Approve = new(Values.Approve);

    public ReviewLinkAccess(string value)
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
    public static ReviewLinkAccess FromCustom(string value)
    {
        return new ReviewLinkAccess(value);
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

    public static bool operator ==(ReviewLinkAccess value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReviewLinkAccess value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReviewLinkAccess value) => value.Value;

    public static explicit operator ReviewLinkAccess(string value) => new(value);

    internal class ReviewLinkAccessSerializer : JsonConverter<ReviewLinkAccess>
    {
        public override ReviewLinkAccess Read(
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
            return new ReviewLinkAccess(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReviewLinkAccess value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReviewLinkAccess ReadAsPropertyName(
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
            return new ReviewLinkAccess(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReviewLinkAccess value,
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
        public const string View = "view";

        public const string Comment = "comment";

        public const string Approve = "approve";
    }
}

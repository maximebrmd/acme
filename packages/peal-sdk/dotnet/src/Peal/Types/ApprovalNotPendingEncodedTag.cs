using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ApprovalNotPendingEncodedTag.ApprovalNotPendingEncodedTagSerializer))]
[Serializable]
public readonly record struct ApprovalNotPendingEncodedTag : IStringEnum
{
    public static readonly ApprovalNotPendingEncodedTag ApprovalNotPending = new(
        Values.ApprovalNotPending
    );

    public ApprovalNotPendingEncodedTag(string value)
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
    public static ApprovalNotPendingEncodedTag FromCustom(string value)
    {
        return new ApprovalNotPendingEncodedTag(value);
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

    public static bool operator ==(ApprovalNotPendingEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ApprovalNotPendingEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ApprovalNotPendingEncodedTag value) => value.Value;

    public static explicit operator ApprovalNotPendingEncodedTag(string value) => new(value);

    internal class ApprovalNotPendingEncodedTagSerializer
        : JsonConverter<ApprovalNotPendingEncodedTag>
    {
        public override ApprovalNotPendingEncodedTag Read(
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
            return new ApprovalNotPendingEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ApprovalNotPendingEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ApprovalNotPendingEncodedTag ReadAsPropertyName(
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
            return new ApprovalNotPendingEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ApprovalNotPendingEncodedTag value,
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
        public const string ApprovalNotPending = "ApprovalNotPending";
    }
}

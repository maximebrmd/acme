using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ApprovalStatus.ApprovalStatusSerializer))]
[Serializable]
public readonly record struct ApprovalStatus : IStringEnum
{
    public static readonly ApprovalStatus Pending = new(Values.Pending);

    public static readonly ApprovalStatus Approved = new(Values.Approved);

    public static readonly ApprovalStatus ChangesRequested = new(Values.ChangesRequested);

    public static readonly ApprovalStatus Withdrawn = new(Values.Withdrawn);

    public ApprovalStatus(string value)
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
    public static ApprovalStatus FromCustom(string value)
    {
        return new ApprovalStatus(value);
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

    public static bool operator ==(ApprovalStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ApprovalStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ApprovalStatus value) => value.Value;

    public static explicit operator ApprovalStatus(string value) => new(value);

    internal class ApprovalStatusSerializer : JsonConverter<ApprovalStatus>
    {
        public override ApprovalStatus Read(
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
            return new ApprovalStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ApprovalStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ApprovalStatus ReadAsPropertyName(
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
            return new ApprovalStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ApprovalStatus value,
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
        public const string Pending = "pending";

        public const string Approved = "approved";

        public const string ChangesRequested = "changesRequested";

        public const string Withdrawn = "withdrawn";
    }
}

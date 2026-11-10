using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ApprovalOrigin.ApprovalOriginSerializer))]
[Serializable]
public readonly record struct ApprovalOrigin : IStringEnum
{
    public static readonly ApprovalOrigin Member = new(Values.Member);

    public static readonly ApprovalOrigin ApiKey = new(Values.ApiKey);

    public static readonly ApprovalOrigin Application = new(Values.Application);

    public ApprovalOrigin(string value)
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
    public static ApprovalOrigin FromCustom(string value)
    {
        return new ApprovalOrigin(value);
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

    public static bool operator ==(ApprovalOrigin value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ApprovalOrigin value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ApprovalOrigin value) => value.Value;

    public static explicit operator ApprovalOrigin(string value) => new(value);

    internal class ApprovalOriginSerializer : JsonConverter<ApprovalOrigin>
    {
        public override ApprovalOrigin Read(
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
            return new ApprovalOrigin(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ApprovalOrigin value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ApprovalOrigin ReadAsPropertyName(
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
            return new ApprovalOrigin(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ApprovalOrigin value,
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

        public const string Application = "application";
    }
}

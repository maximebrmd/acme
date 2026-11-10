using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ApprovalPolicy.ApprovalPolicySerializer))]
[Serializable]
public readonly record struct ApprovalPolicy : IStringEnum
{
    public static readonly ApprovalPolicy Never = new(Values.Never);

    public static readonly ApprovalPolicy ContributorsAndApplications = new(
        Values.ContributorsAndApplications
    );

    public static readonly ApprovalPolicy Always = new(Values.Always);

    public ApprovalPolicy(string value)
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
    public static ApprovalPolicy FromCustom(string value)
    {
        return new ApprovalPolicy(value);
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

    public static bool operator ==(ApprovalPolicy value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ApprovalPolicy value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ApprovalPolicy value) => value.Value;

    public static explicit operator ApprovalPolicy(string value) => new(value);

    internal class ApprovalPolicySerializer : JsonConverter<ApprovalPolicy>
    {
        public override ApprovalPolicy Read(
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
            return new ApprovalPolicy(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ApprovalPolicy value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ApprovalPolicy ReadAsPropertyName(
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
            return new ApprovalPolicy(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ApprovalPolicy value,
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
        public const string Never = "never";

        public const string ContributorsAndApplications = "contributorsAndApplications";

        public const string Always = "always";
    }
}

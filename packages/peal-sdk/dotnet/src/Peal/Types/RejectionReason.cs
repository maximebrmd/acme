using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(RejectionReason.RejectionReasonSerializer))]
[Serializable]
public readonly record struct RejectionReason : IStringEnum
{
    public static readonly RejectionReason SizeMismatch = new(Values.SizeMismatch);

    public static readonly RejectionReason TypeMismatch = new(Values.TypeMismatch);

    public RejectionReason(string value)
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
    public static RejectionReason FromCustom(string value)
    {
        return new RejectionReason(value);
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

    public static bool operator ==(RejectionReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RejectionReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RejectionReason value) => value.Value;

    public static explicit operator RejectionReason(string value) => new(value);

    internal class RejectionReasonSerializer : JsonConverter<RejectionReason>
    {
        public override RejectionReason Read(
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
            return new RejectionReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RejectionReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RejectionReason ReadAsPropertyName(
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
            return new RejectionReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RejectionReason value,
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
        public const string SizeMismatch = "sizeMismatch";

        public const string TypeMismatch = "typeMismatch";
    }
}

using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(UsageAllowanceReachedEncodedTag.UsageAllowanceReachedEncodedTagSerializer))]
[Serializable]
public readonly record struct UsageAllowanceReachedEncodedTag : IStringEnum
{
    public static readonly UsageAllowanceReachedEncodedTag UsageAllowanceReached = new(
        Values.UsageAllowanceReached
    );

    public UsageAllowanceReachedEncodedTag(string value)
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
    public static UsageAllowanceReachedEncodedTag FromCustom(string value)
    {
        return new UsageAllowanceReachedEncodedTag(value);
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

    public static bool operator ==(UsageAllowanceReachedEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UsageAllowanceReachedEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UsageAllowanceReachedEncodedTag value) => value.Value;

    public static explicit operator UsageAllowanceReachedEncodedTag(string value) => new(value);

    internal class UsageAllowanceReachedEncodedTagSerializer
        : JsonConverter<UsageAllowanceReachedEncodedTag>
    {
        public override UsageAllowanceReachedEncodedTag Read(
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
            return new UsageAllowanceReachedEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UsageAllowanceReachedEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UsageAllowanceReachedEncodedTag ReadAsPropertyName(
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
            return new UsageAllowanceReachedEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UsageAllowanceReachedEncodedTag value,
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
        public const string UsageAllowanceReached = "UsageAllowanceReached";
    }
}

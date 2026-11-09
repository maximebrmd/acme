using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PlanLimitReachedEncodedTag.PlanLimitReachedEncodedTagSerializer))]
[Serializable]
public readonly record struct PlanLimitReachedEncodedTag : IStringEnum
{
    public static readonly PlanLimitReachedEncodedTag PlanLimitReached = new(
        Values.PlanLimitReached
    );

    public PlanLimitReachedEncodedTag(string value)
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
    public static PlanLimitReachedEncodedTag FromCustom(string value)
    {
        return new PlanLimitReachedEncodedTag(value);
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

    public static bool operator ==(PlanLimitReachedEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(PlanLimitReachedEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(PlanLimitReachedEncodedTag value) => value.Value;

    public static explicit operator PlanLimitReachedEncodedTag(string value) => new(value);

    internal class PlanLimitReachedEncodedTagSerializer : JsonConverter<PlanLimitReachedEncodedTag>
    {
        public override PlanLimitReachedEncodedTag Read(
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
            return new PlanLimitReachedEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PlanLimitReachedEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PlanLimitReachedEncodedTag ReadAsPropertyName(
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
            return new PlanLimitReachedEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PlanLimitReachedEncodedTag value,
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
        public const string PlanLimitReached = "PlanLimitReached";
    }
}

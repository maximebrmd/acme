using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FollowUpCapabilitiesKind.FollowUpCapabilitiesKindSerializer))]
[Serializable]
public readonly record struct FollowUpCapabilitiesKind : IStringEnum
{
    public static readonly FollowUpCapabilitiesKind Thread = new(Values.Thread);

    public static readonly FollowUpCapabilitiesKind Comment = new(Values.Comment);

    public FollowUpCapabilitiesKind(string value)
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
    public static FollowUpCapabilitiesKind FromCustom(string value)
    {
        return new FollowUpCapabilitiesKind(value);
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

    public static bool operator ==(FollowUpCapabilitiesKind value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FollowUpCapabilitiesKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FollowUpCapabilitiesKind value) => value.Value;

    public static explicit operator FollowUpCapabilitiesKind(string value) => new(value);

    internal class FollowUpCapabilitiesKindSerializer : JsonConverter<FollowUpCapabilitiesKind>
    {
        public override FollowUpCapabilitiesKind Read(
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
            return new FollowUpCapabilitiesKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FollowUpCapabilitiesKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FollowUpCapabilitiesKind ReadAsPropertyName(
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
            return new FollowUpCapabilitiesKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FollowUpCapabilitiesKind value,
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
        public const string Thread = "thread";

        public const string Comment = "comment";
    }
}

using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(InboxAbilityStanding.InboxAbilityStandingSerializer))]
[Serializable]
public readonly record struct InboxAbilityStanding : IStringEnum
{
    public static readonly InboxAbilityStanding Available = new(Values.Available);

    public static readonly InboxAbilityStanding Reconnect = new(Values.Reconnect);

    public static readonly InboxAbilityStanding Unsupported = new(Values.Unsupported);

    public InboxAbilityStanding(string value)
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
    public static InboxAbilityStanding FromCustom(string value)
    {
        return new InboxAbilityStanding(value);
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

    public static bool operator ==(InboxAbilityStanding value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxAbilityStanding value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxAbilityStanding value) => value.Value;

    public static explicit operator InboxAbilityStanding(string value) => new(value);

    internal class InboxAbilityStandingSerializer : JsonConverter<InboxAbilityStanding>
    {
        public override InboxAbilityStanding Read(
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
            return new InboxAbilityStanding(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxAbilityStanding value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxAbilityStanding ReadAsPropertyName(
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
            return new InboxAbilityStanding(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxAbilityStanding value,
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
        public const string Available = "available";

        public const string Reconnect = "reconnect";

        public const string Unsupported = "unsupported";
    }
}

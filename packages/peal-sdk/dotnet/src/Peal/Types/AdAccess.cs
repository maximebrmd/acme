using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AdAccess.AdAccessSerializer))]
[Serializable]
public readonly record struct AdAccess : IStringEnum
{
    public static readonly AdAccess Working = new(Values.Working);

    public static readonly AdAccess ReconnectNeeded = new(Values.ReconnectNeeded);

    public AdAccess(string value)
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
    public static AdAccess FromCustom(string value)
    {
        return new AdAccess(value);
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

    public static bool operator ==(AdAccess value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(AdAccess value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(AdAccess value) => value.Value;

    public static explicit operator AdAccess(string value) => new(value);

    internal class AdAccessSerializer : JsonConverter<AdAccess>
    {
        public override AdAccess Read(
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
            return new AdAccess(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AdAccess value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AdAccess ReadAsPropertyName(
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
            return new AdAccess(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AdAccess value,
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
        public const string Working = "working";

        public const string ReconnectNeeded = "reconnectNeeded";
    }
}

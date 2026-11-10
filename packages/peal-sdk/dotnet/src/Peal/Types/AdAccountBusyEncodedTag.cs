using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AdAccountBusyEncodedTag.AdAccountBusyEncodedTagSerializer))]
[Serializable]
public readonly record struct AdAccountBusyEncodedTag : IStringEnum
{
    public static readonly AdAccountBusyEncodedTag AdAccountBusy = new(Values.AdAccountBusy);

    public AdAccountBusyEncodedTag(string value)
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
    public static AdAccountBusyEncodedTag FromCustom(string value)
    {
        return new AdAccountBusyEncodedTag(value);
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

    public static bool operator ==(AdAccountBusyEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AdAccountBusyEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AdAccountBusyEncodedTag value) => value.Value;

    public static explicit operator AdAccountBusyEncodedTag(string value) => new(value);

    internal class AdAccountBusyEncodedTagSerializer : JsonConverter<AdAccountBusyEncodedTag>
    {
        public override AdAccountBusyEncodedTag Read(
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
            return new AdAccountBusyEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AdAccountBusyEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AdAccountBusyEncodedTag ReadAsPropertyName(
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
            return new AdAccountBusyEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AdAccountBusyEncodedTag value,
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
        public const string AdAccountBusy = "AdAccountBusy";
    }
}

using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AdSignInFailedEncodedTag.AdSignInFailedEncodedTagSerializer))]
[Serializable]
public readonly record struct AdSignInFailedEncodedTag : IStringEnum
{
    public static readonly AdSignInFailedEncodedTag AdSignInFailed = new(Values.AdSignInFailed);

    public AdSignInFailedEncodedTag(string value)
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
    public static AdSignInFailedEncodedTag FromCustom(string value)
    {
        return new AdSignInFailedEncodedTag(value);
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

    public static bool operator ==(AdSignInFailedEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AdSignInFailedEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AdSignInFailedEncodedTag value) => value.Value;

    public static explicit operator AdSignInFailedEncodedTag(string value) => new(value);

    internal class AdSignInFailedEncodedTagSerializer : JsonConverter<AdSignInFailedEncodedTag>
    {
        public override AdSignInFailedEncodedTag Read(
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
            return new AdSignInFailedEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AdSignInFailedEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AdSignInFailedEncodedTag ReadAsPropertyName(
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
            return new AdSignInFailedEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AdSignInFailedEncodedTag value,
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
        public const string AdSignInFailed = "AdSignInFailed";
    }
}

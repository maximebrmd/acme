using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(MastodonQuotePolicy.MastodonQuotePolicySerializer))]
[Serializable]
public readonly record struct MastodonQuotePolicy : IStringEnum
{
    public static readonly MastodonQuotePolicy Public = new(Values.Public);

    public static readonly MastodonQuotePolicy Followers = new(Values.Followers);

    public static readonly MastodonQuotePolicy Nobody = new(Values.Nobody);

    public MastodonQuotePolicy(string value)
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
    public static MastodonQuotePolicy FromCustom(string value)
    {
        return new MastodonQuotePolicy(value);
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

    public static bool operator ==(MastodonQuotePolicy value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(MastodonQuotePolicy value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(MastodonQuotePolicy value) => value.Value;

    public static explicit operator MastodonQuotePolicy(string value) => new(value);

    internal class MastodonQuotePolicySerializer : JsonConverter<MastodonQuotePolicy>
    {
        public override MastodonQuotePolicy Read(
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
            return new MastodonQuotePolicy(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            MastodonQuotePolicy value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override MastodonQuotePolicy ReadAsPropertyName(
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
            return new MastodonQuotePolicy(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            MastodonQuotePolicy value,
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
        public const string Public = "public";

        public const string Followers = "followers";

        public const string Nobody = "nobody";
    }
}

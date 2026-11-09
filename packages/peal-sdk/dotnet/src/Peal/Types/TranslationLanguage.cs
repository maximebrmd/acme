using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(TranslationLanguage.TranslationLanguageSerializer))]
[Serializable]
public readonly record struct TranslationLanguage : IStringEnum
{
    public static readonly TranslationLanguage En = new(Values.En);

    public static readonly TranslationLanguage Fr = new(Values.Fr);

    public static readonly TranslationLanguage De = new(Values.De);

    public static readonly TranslationLanguage Es = new(Values.Es);

    public static readonly TranslationLanguage It = new(Values.It);

    public static readonly TranslationLanguage Pt = new(Values.Pt);

    public static readonly TranslationLanguage Nl = new(Values.Nl);

    public static readonly TranslationLanguage Pl = new(Values.Pl);

    public static readonly TranslationLanguage Ja = new(Values.Ja);

    public static readonly TranslationLanguage ZhHans = new(Values.ZhHans);

    public TranslationLanguage(string value)
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
    public static TranslationLanguage FromCustom(string value)
    {
        return new TranslationLanguage(value);
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

    public static bool operator ==(TranslationLanguage value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TranslationLanguage value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TranslationLanguage value) => value.Value;

    public static explicit operator TranslationLanguage(string value) => new(value);

    internal class TranslationLanguageSerializer : JsonConverter<TranslationLanguage>
    {
        public override TranslationLanguage Read(
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
            return new TranslationLanguage(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TranslationLanguage value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TranslationLanguage ReadAsPropertyName(
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
            return new TranslationLanguage(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TranslationLanguage value,
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
        public const string En = "en";

        public const string Fr = "fr";

        public const string De = "de";

        public const string Es = "es";

        public const string It = "it";

        public const string Pt = "pt";

        public const string Nl = "nl";

        public const string Pl = "pl";

        public const string Ja = "ja";

        public const string ZhHans = "zh-Hans";
    }
}

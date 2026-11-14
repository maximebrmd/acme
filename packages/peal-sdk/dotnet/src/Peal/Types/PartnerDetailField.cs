using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PartnerDetailField.PartnerDetailFieldSerializer))]
[Serializable]
public readonly record struct PartnerDetailField : IStringEnum
{
    public static readonly PartnerDetailField Name = new(Values.Name);

    public static readonly PartnerDetailField LogoUrl = new(Values.LogoUrl);

    public static readonly PartnerDetailField AccentColor = new(Values.AccentColor);

    public static readonly PartnerDetailField ReturnOrigins = new(Values.ReturnOrigins);

    public static readonly PartnerDetailField ExternalId = new(Values.ExternalId);

    public static readonly PartnerDetailField Permissions = new(Values.Permissions);

    public PartnerDetailField(string value)
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
    public static PartnerDetailField FromCustom(string value)
    {
        return new PartnerDetailField(value);
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

    public static bool operator ==(PartnerDetailField value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(PartnerDetailField value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(PartnerDetailField value) => value.Value;

    public static explicit operator PartnerDetailField(string value) => new(value);

    internal class PartnerDetailFieldSerializer : JsonConverter<PartnerDetailField>
    {
        public override PartnerDetailField Read(
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
            return new PartnerDetailField(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PartnerDetailField value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PartnerDetailField ReadAsPropertyName(
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
            return new PartnerDetailField(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PartnerDetailField value,
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
        public const string Name = "name";

        public const string LogoUrl = "logoUrl";

        public const string AccentColor = "accentColor";

        public const string ReturnOrigins = "returnOrigins";

        public const string ExternalId = "externalId";

        public const string Permissions = "permissions";
    }
}

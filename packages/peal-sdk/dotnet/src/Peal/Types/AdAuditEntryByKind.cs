using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AdAuditEntryByKind.AdAuditEntryByKindSerializer))]
[Serializable]
public readonly record struct AdAuditEntryByKind : IStringEnum
{
    public static readonly AdAuditEntryByKind User = new(Values.User);

    public static readonly AdAuditEntryByKind ApiKey = new(Values.ApiKey);

    public AdAuditEntryByKind(string value)
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
    public static AdAuditEntryByKind FromCustom(string value)
    {
        return new AdAuditEntryByKind(value);
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

    public static bool operator ==(AdAuditEntryByKind value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AdAuditEntryByKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AdAuditEntryByKind value) => value.Value;

    public static explicit operator AdAuditEntryByKind(string value) => new(value);

    internal class AdAuditEntryByKindSerializer : JsonConverter<AdAuditEntryByKind>
    {
        public override AdAuditEntryByKind Read(
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
            return new AdAuditEntryByKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AdAuditEntryByKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AdAuditEntryByKind ReadAsPropertyName(
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
            return new AdAuditEntryByKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AdAuditEntryByKind value,
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
        public const string User = "user";

        public const string ApiKey = "apiKey";
    }
}

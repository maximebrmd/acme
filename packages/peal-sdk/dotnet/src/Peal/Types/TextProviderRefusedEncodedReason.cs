using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(TextProviderRefusedEncodedReason.TextProviderRefusedEncodedReasonSerializer))]
[Serializable]
public readonly record struct TextProviderRefusedEncodedReason : IStringEnum
{
    public static readonly TextProviderRefusedEncodedReason SettingsRefused = new(
        Values.SettingsRefused
    );

    public static readonly TextProviderRefusedEncodedReason Redirected = new(Values.Redirected);

    public static readonly TextProviderRefusedEncodedReason AddressRefused = new(
        Values.AddressRefused
    );

    public static readonly TextProviderRefusedEncodedReason KeyUnreadable = new(
        Values.KeyUnreadable
    );

    public TextProviderRefusedEncodedReason(string value)
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
    public static TextProviderRefusedEncodedReason FromCustom(string value)
    {
        return new TextProviderRefusedEncodedReason(value);
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

    public static bool operator ==(TextProviderRefusedEncodedReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TextProviderRefusedEncodedReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TextProviderRefusedEncodedReason value) => value.Value;

    public static explicit operator TextProviderRefusedEncodedReason(string value) => new(value);

    internal class TextProviderRefusedEncodedReasonSerializer
        : JsonConverter<TextProviderRefusedEncodedReason>
    {
        public override TextProviderRefusedEncodedReason Read(
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
            return new TextProviderRefusedEncodedReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TextProviderRefusedEncodedReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TextProviderRefusedEncodedReason ReadAsPropertyName(
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
            return new TextProviderRefusedEncodedReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TextProviderRefusedEncodedReason value,
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
        public const string SettingsRefused = "settingsRefused";

        public const string Redirected = "redirected";

        public const string AddressRefused = "addressRefused";

        public const string KeyUnreadable = "keyUnreadable";
    }
}

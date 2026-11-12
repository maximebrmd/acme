using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(
    typeof(ImageProviderRefusedEncodedReason.ImageProviderRefusedEncodedReasonSerializer)
)]
[Serializable]
public readonly record struct ImageProviderRefusedEncodedReason : IStringEnum
{
    public static readonly ImageProviderRefusedEncodedReason SettingsRefused = new(
        Values.SettingsRefused
    );

    public static readonly ImageProviderRefusedEncodedReason Redirected = new(Values.Redirected);

    public static readonly ImageProviderRefusedEncodedReason AddressRefused = new(
        Values.AddressRefused
    );

    public static readonly ImageProviderRefusedEncodedReason KeyUnreadable = new(
        Values.KeyUnreadable
    );

    public ImageProviderRefusedEncodedReason(string value)
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
    public static ImageProviderRefusedEncodedReason FromCustom(string value)
    {
        return new ImageProviderRefusedEncodedReason(value);
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

    public static bool operator ==(ImageProviderRefusedEncodedReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ImageProviderRefusedEncodedReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ImageProviderRefusedEncodedReason value) => value.Value;

    public static explicit operator ImageProviderRefusedEncodedReason(string value) => new(value);

    internal class ImageProviderRefusedEncodedReasonSerializer
        : JsonConverter<ImageProviderRefusedEncodedReason>
    {
        public override ImageProviderRefusedEncodedReason Read(
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
            return new ImageProviderRefusedEncodedReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ImageProviderRefusedEncodedReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ImageProviderRefusedEncodedReason ReadAsPropertyName(
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
            return new ImageProviderRefusedEncodedReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ImageProviderRefusedEncodedReason value,
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

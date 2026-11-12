using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ImageProviderAddressRefusal.ImageProviderAddressRefusalSerializer))]
[Serializable]
public readonly record struct ImageProviderAddressRefusal : IStringEnum
{
    public static readonly ImageProviderAddressRefusal Malformed = new(Values.Malformed);

    public static readonly ImageProviderAddressRefusal NotHttps = new(Values.NotHttps);

    public static readonly ImageProviderAddressRefusal Credentials = new(Values.Credentials);

    public static readonly ImageProviderAddressRefusal QueryOrFragment = new(
        Values.QueryOrFragment
    );

    public static readonly ImageProviderAddressRefusal TooLong = new(Values.TooLong);

    public static readonly ImageProviderAddressRefusal NotPublic = new(Values.NotPublic);

    public static readonly ImageProviderAddressRefusal UnknownHost = new(Values.UnknownHost);

    public ImageProviderAddressRefusal(string value)
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
    public static ImageProviderAddressRefusal FromCustom(string value)
    {
        return new ImageProviderAddressRefusal(value);
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

    public static bool operator ==(ImageProviderAddressRefusal value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ImageProviderAddressRefusal value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ImageProviderAddressRefusal value) => value.Value;

    public static explicit operator ImageProviderAddressRefusal(string value) => new(value);

    internal class ImageProviderAddressRefusalSerializer
        : JsonConverter<ImageProviderAddressRefusal>
    {
        public override ImageProviderAddressRefusal Read(
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
            return new ImageProviderAddressRefusal(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ImageProviderAddressRefusal value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ImageProviderAddressRefusal ReadAsPropertyName(
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
            return new ImageProviderAddressRefusal(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ImageProviderAddressRefusal value,
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
        public const string Malformed = "malformed";

        public const string NotHttps = "notHttps";

        public const string Credentials = "credentials";

        public const string QueryOrFragment = "queryOrFragment";

        public const string TooLong = "tooLong";

        public const string NotPublic = "notPublic";

        public const string UnknownHost = "unknownHost";
    }
}

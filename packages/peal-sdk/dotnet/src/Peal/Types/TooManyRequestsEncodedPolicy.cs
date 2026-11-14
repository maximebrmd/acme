using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(TooManyRequestsEncodedPolicy.TooManyRequestsEncodedPolicySerializer))]
[Serializable]
public readonly record struct TooManyRequestsEncodedPolicy : IStringEnum
{
    public static readonly TooManyRequestsEncodedPolicy Default = new(Values.Default);

    public static readonly TooManyRequestsEncodedPolicy Free = new(Values.Free);

    public static readonly TooManyRequestsEncodedPolicy Override = new(Values.Override);

    public TooManyRequestsEncodedPolicy(string value)
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
    public static TooManyRequestsEncodedPolicy FromCustom(string value)
    {
        return new TooManyRequestsEncodedPolicy(value);
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

    public static bool operator ==(TooManyRequestsEncodedPolicy value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TooManyRequestsEncodedPolicy value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TooManyRequestsEncodedPolicy value) => value.Value;

    public static explicit operator TooManyRequestsEncodedPolicy(string value) => new(value);

    internal class TooManyRequestsEncodedPolicySerializer
        : JsonConverter<TooManyRequestsEncodedPolicy>
    {
        public override TooManyRequestsEncodedPolicy Read(
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
            return new TooManyRequestsEncodedPolicy(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TooManyRequestsEncodedPolicy value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TooManyRequestsEncodedPolicy ReadAsPropertyName(
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
            return new TooManyRequestsEncodedPolicy(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TooManyRequestsEncodedPolicy value,
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
        public const string Default = "default";

        public const string Free = "free";

        public const string Override = "override";
    }
}

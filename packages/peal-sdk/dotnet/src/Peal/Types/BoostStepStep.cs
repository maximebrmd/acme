using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(BoostStepStep.BoostStepStepSerializer))]
[Serializable]
public readonly record struct BoostStepStep : IStringEnum
{
    public static readonly BoostStepStep CreateCampaign = new(Values.CreateCampaign);

    public static readonly BoostStepStep CreateAdSet = new(Values.CreateAdSet);

    public static readonly BoostStepStep CreateAd = new(Values.CreateAd);

    public static readonly BoostStepStep ActivateAd = new(Values.ActivateAd);

    public static readonly BoostStepStep ActivateAdSet = new(Values.ActivateAdSet);

    public static readonly BoostStepStep ActivateCampaign = new(Values.ActivateCampaign);

    public static readonly BoostStepStep Pause = new(Values.Pause);

    public static readonly BoostStepStep Resume = new(Values.Resume);

    public BoostStepStep(string value)
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
    public static BoostStepStep FromCustom(string value)
    {
        return new BoostStepStep(value);
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

    public static bool operator ==(BoostStepStep value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BoostStepStep value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BoostStepStep value) => value.Value;

    public static explicit operator BoostStepStep(string value) => new(value);

    internal class BoostStepStepSerializer : JsonConverter<BoostStepStep>
    {
        public override BoostStepStep Read(
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
            return new BoostStepStep(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BoostStepStep value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BoostStepStep ReadAsPropertyName(
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
            return new BoostStepStep(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BoostStepStep value,
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
        public const string CreateCampaign = "createCampaign";

        public const string CreateAdSet = "createAdSet";

        public const string CreateAd = "createAd";

        public const string ActivateAd = "activateAd";

        public const string ActivateAdSet = "activateAdSet";

        public const string ActivateCampaign = "activateCampaign";

        public const string Pause = "pause";

        public const string Resume = "resume";
    }
}

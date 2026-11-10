using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(CampaignObjective.CampaignObjectiveSerializer))]
[Serializable]
public readonly record struct CampaignObjective : IStringEnum
{
    public static readonly CampaignObjective Awareness = new(Values.Awareness);

    public static readonly CampaignObjective Traffic = new(Values.Traffic);

    public static readonly CampaignObjective Engagement = new(Values.Engagement);

    public static readonly CampaignObjective Leads = new(Values.Leads);

    public static readonly CampaignObjective AppPromotion = new(Values.AppPromotion);

    public static readonly CampaignObjective Sales = new(Values.Sales);

    public static readonly CampaignObjective Other = new(Values.Other);

    public CampaignObjective(string value)
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
    public static CampaignObjective FromCustom(string value)
    {
        return new CampaignObjective(value);
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

    public static bool operator ==(CampaignObjective value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CampaignObjective value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CampaignObjective value) => value.Value;

    public static explicit operator CampaignObjective(string value) => new(value);

    internal class CampaignObjectiveSerializer : JsonConverter<CampaignObjective>
    {
        public override CampaignObjective Read(
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
            return new CampaignObjective(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CampaignObjective value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CampaignObjective ReadAsPropertyName(
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
            return new CampaignObjective(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CampaignObjective value,
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
        public const string Awareness = "awareness";

        public const string Traffic = "traffic";

        public const string Engagement = "engagement";

        public const string Leads = "leads";

        public const string AppPromotion = "appPromotion";

        public const string Sales = "sales";

        public const string Other = "other";
    }
}

pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum CampaignObjective {
    Awareness,
    Traffic,
    Engagement,
    Leads,
    AppPromotion,
    Sales,
    Other,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for CampaignObjective {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Awareness => serializer.serialize_str("awareness"),
            Self::Traffic => serializer.serialize_str("traffic"),
            Self::Engagement => serializer.serialize_str("engagement"),
            Self::Leads => serializer.serialize_str("leads"),
            Self::AppPromotion => serializer.serialize_str("appPromotion"),
            Self::Sales => serializer.serialize_str("sales"),
            Self::Other => serializer.serialize_str("other"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for CampaignObjective {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "awareness" => Ok(Self::Awareness),
            "traffic" => Ok(Self::Traffic),
            "engagement" => Ok(Self::Engagement),
            "leads" => Ok(Self::Leads),
            "appPromotion" => Ok(Self::AppPromotion),
            "sales" => Ok(Self::Sales),
            "other" => Ok(Self::Other),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for CampaignObjective {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Awareness => write!(f, "awareness"),
            Self::Traffic => write!(f, "traffic"),
            Self::Engagement => write!(f, "engagement"),
            Self::Leads => write!(f, "leads"),
            Self::AppPromotion => write!(f, "appPromotion"),
            Self::Sales => write!(f, "sales"),
            Self::Other => write!(f, "other"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}

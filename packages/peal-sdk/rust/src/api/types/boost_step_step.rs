pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum BoostStepStep {
    CreateCampaign,
    CreateAdSet,
    CreateAd,
    ActivateAd,
    ActivateAdSet,
    ActivateCampaign,
    Pause,
    Resume,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for BoostStepStep {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::CreateCampaign => serializer.serialize_str("createCampaign"),
            Self::CreateAdSet => serializer.serialize_str("createAdSet"),
            Self::CreateAd => serializer.serialize_str("createAd"),
            Self::ActivateAd => serializer.serialize_str("activateAd"),
            Self::ActivateAdSet => serializer.serialize_str("activateAdSet"),
            Self::ActivateCampaign => serializer.serialize_str("activateCampaign"),
            Self::Pause => serializer.serialize_str("pause"),
            Self::Resume => serializer.serialize_str("resume"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for BoostStepStep {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "createCampaign" => Ok(Self::CreateCampaign),
            "createAdSet" => Ok(Self::CreateAdSet),
            "createAd" => Ok(Self::CreateAd),
            "activateAd" => Ok(Self::ActivateAd),
            "activateAdSet" => Ok(Self::ActivateAdSet),
            "activateCampaign" => Ok(Self::ActivateCampaign),
            "pause" => Ok(Self::Pause),
            "resume" => Ok(Self::Resume),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for BoostStepStep {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::CreateCampaign => write!(f, "createCampaign"),
            Self::CreateAdSet => write!(f, "createAdSet"),
            Self::CreateAd => write!(f, "createAd"),
            Self::ActivateAd => write!(f, "activateAd"),
            Self::ActivateAdSet => write!(f, "activateAdSet"),
            Self::ActivateCampaign => write!(f, "activateCampaign"),
            Self::Pause => write!(f, "pause"),
            Self::Resume => write!(f, "resume"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}

pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ImageProviderRefusedEncodedReason {
    SettingsRefused,
    Redirected,
    AddressRefused,
    KeyUnreadable,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ImageProviderRefusedEncodedReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::SettingsRefused => serializer.serialize_str("settingsRefused"),
            Self::Redirected => serializer.serialize_str("redirected"),
            Self::AddressRefused => serializer.serialize_str("addressRefused"),
            Self::KeyUnreadable => serializer.serialize_str("keyUnreadable"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ImageProviderRefusedEncodedReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "settingsRefused" => Ok(Self::SettingsRefused),
            "redirected" => Ok(Self::Redirected),
            "addressRefused" => Ok(Self::AddressRefused),
            "keyUnreadable" => Ok(Self::KeyUnreadable),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ImageProviderRefusedEncodedReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::SettingsRefused => write!(f, "settingsRefused"),
            Self::Redirected => write!(f, "redirected"),
            Self::AddressRefused => write!(f, "addressRefused"),
            Self::KeyUnreadable => write!(f, "keyUnreadable"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}

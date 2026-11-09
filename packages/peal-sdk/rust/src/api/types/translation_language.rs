pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum TranslationLanguage {
    En,
    Fr,
    De,
    Es,
    It,
    Pt,
    Nl,
    Pl,
    Ja,
    ZhHans,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for TranslationLanguage {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::En => serializer.serialize_str("en"),
            Self::Fr => serializer.serialize_str("fr"),
            Self::De => serializer.serialize_str("de"),
            Self::Es => serializer.serialize_str("es"),
            Self::It => serializer.serialize_str("it"),
            Self::Pt => serializer.serialize_str("pt"),
            Self::Nl => serializer.serialize_str("nl"),
            Self::Pl => serializer.serialize_str("pl"),
            Self::Ja => serializer.serialize_str("ja"),
            Self::ZhHans => serializer.serialize_str("zh-Hans"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for TranslationLanguage {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "en" => Ok(Self::En),
            "fr" => Ok(Self::Fr),
            "de" => Ok(Self::De),
            "es" => Ok(Self::Es),
            "it" => Ok(Self::It),
            "pt" => Ok(Self::Pt),
            "nl" => Ok(Self::Nl),
            "pl" => Ok(Self::Pl),
            "ja" => Ok(Self::Ja),
            "zh-Hans" => Ok(Self::ZhHans),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for TranslationLanguage {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::En => write!(f, "en"),
            Self::Fr => write!(f, "fr"),
            Self::De => write!(f, "de"),
            Self::Es => write!(f, "es"),
            Self::It => write!(f, "it"),
            Self::Pt => write!(f, "pt"),
            Self::Nl => write!(f, "nl"),
            Self::Pl => write!(f, "pl"),
            Self::Ja => write!(f, "ja"),
            Self::ZhHans => write!(f, "zh-Hans"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}

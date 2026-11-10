pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum LookupName {
    YoutubeVideoCategories,
    YoutubePlaylists,
    TiktokCreator,
    LinkedinOrganizations,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for LookupName {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::YoutubeVideoCategories => serializer.serialize_str("youtubeVideoCategories"),
            Self::YoutubePlaylists => serializer.serialize_str("youtubePlaylists"),
            Self::TiktokCreator => serializer.serialize_str("tiktokCreator"),
            Self::LinkedinOrganizations => serializer.serialize_str("linkedinOrganizations"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for LookupName {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "youtubeVideoCategories" => Ok(Self::YoutubeVideoCategories),
            "youtubePlaylists" => Ok(Self::YoutubePlaylists),
            "tiktokCreator" => Ok(Self::TiktokCreator),
            "linkedinOrganizations" => Ok(Self::LinkedinOrganizations),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for LookupName {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::YoutubeVideoCategories => write!(f, "youtubeVideoCategories"),
            Self::YoutubePlaylists => write!(f, "youtubePlaylists"),
            Self::TiktokCreator => write!(f, "tiktokCreator"),
            Self::LinkedinOrganizations => write!(f, "linkedinOrganizations"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}

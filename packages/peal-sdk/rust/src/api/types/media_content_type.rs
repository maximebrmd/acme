pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum MediaContentType {
    ImageGif,
    ImageJpeg,
    ImagePng,
    ImageWebp,
    VideoMp4,
    VideoQuicktime,
    ApplicationPdf,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for MediaContentType {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::ImageGif => serializer.serialize_str("image/gif"),
            Self::ImageJpeg => serializer.serialize_str("image/jpeg"),
            Self::ImagePng => serializer.serialize_str("image/png"),
            Self::ImageWebp => serializer.serialize_str("image/webp"),
            Self::VideoMp4 => serializer.serialize_str("video/mp4"),
            Self::VideoQuicktime => serializer.serialize_str("video/quicktime"),
            Self::ApplicationPdf => serializer.serialize_str("application/pdf"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for MediaContentType {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "image/gif" => Ok(Self::ImageGif),
            "image/jpeg" => Ok(Self::ImageJpeg),
            "image/png" => Ok(Self::ImagePng),
            "image/webp" => Ok(Self::ImageWebp),
            "video/mp4" => Ok(Self::VideoMp4),
            "video/quicktime" => Ok(Self::VideoQuicktime),
            "application/pdf" => Ok(Self::ApplicationPdf),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for MediaContentType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ImageGif => write!(f, "image/gif"),
            Self::ImageJpeg => write!(f, "image/jpeg"),
            Self::ImagePng => write!(f, "image/png"),
            Self::ImageWebp => write!(f, "image/webp"),
            Self::VideoMp4 => write!(f, "video/mp4"),
            Self::VideoQuicktime => write!(f, "video/quicktime"),
            Self::ApplicationPdf => write!(f, "application/pdf"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}

pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum MediaStoreUnavailableEncodedTag {
    MediaStoreUnavailable,
}
impl fmt::Display for MediaStoreUnavailableEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::MediaStoreUnavailable => "MediaStoreUnavailable",
        };
        write!(f, "{}", s)
    }
}

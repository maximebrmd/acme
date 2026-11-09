pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum MediaInUseEncodedTag {
    MediaInUse,
}
impl fmt::Display for MediaInUseEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::MediaInUse => "MediaInUse",
        };
        write!(f, "{}", s)
    }
}

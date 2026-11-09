pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AltTextTooLongEncodedTag {
    AltTextTooLong,
}
impl fmt::Display for AltTextTooLongEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::AltTextTooLong => "AltTextTooLong",
        };
        write!(f, "{}", s)
    }
}

pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ReplyInvalidEncodedTag {
    ReplyInvalid,
}
impl fmt::Display for ReplyInvalidEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::ReplyInvalid => "ReplyInvalid",
        };
        write!(f, "{}", s)
    }
}

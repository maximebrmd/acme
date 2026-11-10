pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum CommentInvalidEncodedTag {
    CommentInvalid,
}
impl fmt::Display for CommentInvalidEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::CommentInvalid => "CommentInvalid",
        };
        write!(f, "{}", s)
    }
}

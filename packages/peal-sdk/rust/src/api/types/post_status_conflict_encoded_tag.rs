pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PostStatusConflictEncodedTag {
    PostStatusConflict,
}
impl fmt::Display for PostStatusConflictEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::PostStatusConflict => "PostStatusConflict",
        };
        write!(f, "{}", s)
    }
}

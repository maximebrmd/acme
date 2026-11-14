pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ArticleStateConflictEncodedTag {
    ArticleStateConflict,
}
impl fmt::Display for ArticleStateConflictEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::ArticleStateConflict => "ArticleStateConflict",
        };
        write!(f, "{}", s)
    }
}

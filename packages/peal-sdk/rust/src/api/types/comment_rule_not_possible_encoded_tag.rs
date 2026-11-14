pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum CommentRuleNotPossibleEncodedTag {
    CommentRuleNotPossible,
}
impl fmt::Display for CommentRuleNotPossibleEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::CommentRuleNotPossible => "CommentRuleNotPossible",
        };
        write!(f, "{}", s)
    }
}

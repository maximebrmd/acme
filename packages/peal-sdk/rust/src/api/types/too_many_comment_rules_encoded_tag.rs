pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum TooManyCommentRulesEncodedTag {
    TooManyCommentRules,
}
impl fmt::Display for TooManyCommentRulesEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::TooManyCommentRules => "TooManyCommentRules",
        };
        write!(f, "{}", s)
    }
}

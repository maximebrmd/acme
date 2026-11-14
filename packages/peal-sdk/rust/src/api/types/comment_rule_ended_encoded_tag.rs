pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum CommentRuleEndedEncodedTag {
    CommentRuleEnded,
}
impl fmt::Display for CommentRuleEndedEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::CommentRuleEnded => "CommentRuleEnded",
        };
        write!(f, "{}", s)
    }
}

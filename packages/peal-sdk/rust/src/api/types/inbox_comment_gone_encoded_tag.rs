pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum InboxCommentGoneEncodedTag {
    InboxCommentGone,
}
impl fmt::Display for InboxCommentGoneEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::InboxCommentGone => "InboxCommentGone",
        };
        write!(f, "{}", s)
    }
}

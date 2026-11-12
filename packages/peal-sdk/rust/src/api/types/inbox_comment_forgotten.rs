pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum InboxCommentForgotten {
    #[serde(rename = "expired")]
    Expired,
}
impl fmt::Display for InboxCommentForgotten {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::Expired => "expired",
        };
        write!(f, "{}", s)
    }
}

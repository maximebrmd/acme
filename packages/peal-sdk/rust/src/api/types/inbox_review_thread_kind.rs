pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum InboxReviewThreadKind {
    #[serde(rename = "reviews")]
    Reviews,
}
impl fmt::Display for InboxReviewThreadKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::Reviews => "reviews",
        };
        write!(f, "{}", s)
    }
}

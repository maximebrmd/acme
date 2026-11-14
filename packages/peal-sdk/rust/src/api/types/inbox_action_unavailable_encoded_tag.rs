pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum InboxActionUnavailableEncodedTag {
    InboxActionUnavailable,
}
impl fmt::Display for InboxActionUnavailableEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::InboxActionUnavailable => "InboxActionUnavailable",
        };
        write!(f, "{}", s)
    }
}

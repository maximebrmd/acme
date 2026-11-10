pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum InboxActionFailedEncodedTag {
    InboxActionFailed,
}
impl fmt::Display for InboxActionFailedEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::InboxActionFailed => "InboxActionFailed",
        };
        write!(f, "{}", s)
    }
}

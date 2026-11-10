pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ApprovalNotPendingEncodedTag {
    ApprovalNotPending,
}
impl fmt::Display for ApprovalNotPendingEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::ApprovalNotPending => "ApprovalNotPending",
        };
        write!(f, "{}", s)
    }
}

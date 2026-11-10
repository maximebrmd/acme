pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum WorkspaceBusyEncodedTag {
    WorkspaceBusy,
}
impl fmt::Display for WorkspaceBusyEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::WorkspaceBusy => "WorkspaceBusy",
        };
        write!(f, "{}", s)
    }
}

pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum WorkspaceNotFoundEncodedTag {
    WorkspaceNotFound,
}
impl fmt::Display for WorkspaceNotFoundEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::WorkspaceNotFound => "WorkspaceNotFound",
        };
        write!(f, "{}", s)
    }
}

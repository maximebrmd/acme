pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum DeletionIncompleteEncodedTag {
    DeletionIncomplete,
}
impl fmt::Display for DeletionIncompleteEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::DeletionIncomplete => "DeletionIncomplete",
        };
        write!(f, "{}", s)
    }
}

pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum UploadIncompleteEncodedTag {
    UploadIncomplete,
}
impl fmt::Display for UploadIncompleteEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::UploadIncomplete => "UploadIncomplete",
        };
        write!(f, "{}", s)
    }
}

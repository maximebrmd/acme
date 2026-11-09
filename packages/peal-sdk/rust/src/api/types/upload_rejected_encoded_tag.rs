pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum UploadRejectedEncodedTag {
    UploadRejected,
}
impl fmt::Display for UploadRejectedEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::UploadRejected => "UploadRejected",
        };
        write!(f, "{}", s)
    }
}

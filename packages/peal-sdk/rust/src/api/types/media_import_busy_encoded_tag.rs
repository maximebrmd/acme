pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum MediaImportBusyEncodedTag {
    MediaImportBusy,
}
impl fmt::Display for MediaImportBusyEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::MediaImportBusy => "MediaImportBusy",
        };
        write!(f, "{}", s)
    }
}

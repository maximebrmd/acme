pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ExternalIdTakenEncodedTag {
    ExternalIdTaken,
}
impl fmt::Display for ExternalIdTakenEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::ExternalIdTaken => "ExternalIdTaken",
        };
        write!(f, "{}", s)
    }
}

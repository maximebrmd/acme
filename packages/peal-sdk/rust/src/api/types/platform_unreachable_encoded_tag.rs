pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PlatformUnreachableEncodedTag {
    PlatformUnreachable,
}
impl fmt::Display for PlatformUnreachableEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::PlatformUnreachable => "PlatformUnreachable",
        };
        write!(f, "{}", s)
    }
}

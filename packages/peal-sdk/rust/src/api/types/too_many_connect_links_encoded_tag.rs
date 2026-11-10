pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum TooManyConnectLinksEncodedTag {
    TooManyConnectLinks,
}
impl fmt::Display for TooManyConnectLinksEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::TooManyConnectLinks => "TooManyConnectLinks",
        };
        write!(f, "{}", s)
    }
}

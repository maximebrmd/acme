pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AdNetworkUnavailableEncodedTag {
    AdNetworkUnavailable,
}
impl fmt::Display for AdNetworkUnavailableEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::AdNetworkUnavailable => "AdNetworkUnavailable",
        };
        write!(f, "{}", s)
    }
}

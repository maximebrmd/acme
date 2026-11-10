pub use crate::prelude::*;

/// An ad network: `meta` is Meta's, for ads on Facebook and Instagram. Others may join it.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AdNetwork {
    #[serde(rename = "meta")]
    Meta,
}
impl fmt::Display for AdNetwork {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::Meta => "meta",
        };
        write!(f, "{}", s)
    }
}

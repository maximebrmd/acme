pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PlatformRateLimitedEncodedTag {
    PlatformRateLimited,
}
impl fmt::Display for PlatformRateLimitedEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::PlatformRateLimited => "PlatformRateLimited",
        };
        write!(f, "{}", s)
    }
}

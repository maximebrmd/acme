pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum TooManyRequestsEncodedTag {
    TooManyRequests,
}
impl fmt::Display for TooManyRequestsEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::TooManyRequests => "TooManyRequests",
        };
        write!(f, "{}", s)
    }
}

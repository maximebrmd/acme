pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum TooManyFeedsEncodedTag {
    TooManyFeeds,
}
impl fmt::Display for TooManyFeedsEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::TooManyFeeds => "TooManyFeeds",
        };
        write!(f, "{}", s)
    }
}

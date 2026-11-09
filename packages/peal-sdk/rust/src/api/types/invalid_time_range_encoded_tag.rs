pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum InvalidTimeRangeEncodedTag {
    InvalidTimeRange,
}
impl fmt::Display for InvalidTimeRangeEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::InvalidTimeRange => "InvalidTimeRange",
        };
        write!(f, "{}", s)
    }
}

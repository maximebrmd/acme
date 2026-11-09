pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum InvalidDateRangeEncodedTag {
    InvalidDateRange,
}
impl fmt::Display for InvalidDateRangeEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::InvalidDateRange => "InvalidDateRange",
        };
        write!(f, "{}", s)
    }
}

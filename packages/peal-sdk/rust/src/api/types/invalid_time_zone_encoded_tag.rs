pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum InvalidTimeZoneEncodedTag {
    InvalidTimeZone,
}
impl fmt::Display for InvalidTimeZoneEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::InvalidTimeZone => "InvalidTimeZone",
        };
        write!(f, "{}", s)
    }
}

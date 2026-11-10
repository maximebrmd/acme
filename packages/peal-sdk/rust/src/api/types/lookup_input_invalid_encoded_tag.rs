pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum LookupInputInvalidEncodedTag {
    LookupInputInvalid,
}
impl fmt::Display for LookupInputInvalidEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::LookupInputInvalid => "LookupInputInvalid",
        };
        write!(f, "{}", s)
    }
}

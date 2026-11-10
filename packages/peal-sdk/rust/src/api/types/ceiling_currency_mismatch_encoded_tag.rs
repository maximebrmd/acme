pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum CeilingCurrencyMismatchEncodedTag {
    CeilingCurrencyMismatch,
}
impl fmt::Display for CeilingCurrencyMismatchEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::CeilingCurrencyMismatch => "CeilingCurrencyMismatch",
        };
        write!(f, "{}", s)
    }
}

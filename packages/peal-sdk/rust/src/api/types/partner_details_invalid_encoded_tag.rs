pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PartnerDetailsInvalidEncodedTag {
    PartnerDetailsInvalid,
}
impl fmt::Display for PartnerDetailsInvalidEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::PartnerDetailsInvalid => "PartnerDetailsInvalid",
        };
        write!(f, "{}", s)
    }
}

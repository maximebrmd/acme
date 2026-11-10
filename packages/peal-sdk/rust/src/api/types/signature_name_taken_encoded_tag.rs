pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum SignatureNameTakenEncodedTag {
    SignatureNameTaken,
}
impl fmt::Display for SignatureNameTakenEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::SignatureNameTaken => "SignatureNameTaken",
        };
        write!(f, "{}", s)
    }
}

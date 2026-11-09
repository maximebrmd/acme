pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum UnauthenticatedEncodedTag {
    Unauthenticated,
}
impl fmt::Display for UnauthenticatedEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::Unauthenticated => "Unauthenticated",
        };
        write!(f, "{}", s)
    }
}

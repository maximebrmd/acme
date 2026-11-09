pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ForbiddenEncodedTag {
    Forbidden,
}
impl fmt::Display for ForbiddenEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::Forbidden => "Forbidden",
        };
        write!(f, "{}", s)
    }
}

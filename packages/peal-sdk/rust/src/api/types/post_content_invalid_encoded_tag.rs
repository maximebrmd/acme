pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PostContentInvalidEncodedTag {
    PostContentInvalid,
}
impl fmt::Display for PostContentInvalidEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::PostContentInvalid => "PostContentInvalid",
        };
        write!(f, "{}", s)
    }
}

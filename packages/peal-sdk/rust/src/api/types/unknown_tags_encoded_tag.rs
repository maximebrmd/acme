pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum UnknownTagsEncodedTag {
    UnknownTags,
}
impl fmt::Display for UnknownTagsEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::UnknownTags => "UnknownTags",
        };
        write!(f, "{}", s)
    }
}

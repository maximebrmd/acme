pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ImportUnreadableEncodedTag {
    ImportUnreadable,
}
impl fmt::Display for ImportUnreadableEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::ImportUnreadable => "ImportUnreadable",
        };
        write!(f, "{}", s)
    }
}

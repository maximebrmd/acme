pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum LivePostChangeKind {
    #[serde(rename = "unpublish")]
    Unpublish,
}
impl fmt::Display for LivePostChangeKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::Unpublish => "unpublish",
        };
        write!(f, "{}", s)
    }
}

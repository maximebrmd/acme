pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum LivePostNotChangeableEncodedTag {
    LivePostNotChangeable,
}
impl fmt::Display for LivePostNotChangeableEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::LivePostNotChangeable => "LivePostNotChangeable",
        };
        write!(f, "{}", s)
    }
}

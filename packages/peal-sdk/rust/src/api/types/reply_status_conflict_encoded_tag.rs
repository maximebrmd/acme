pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ReplyStatusConflictEncodedTag {
    ReplyStatusConflict,
}
impl fmt::Display for ReplyStatusConflictEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::ReplyStatusConflict => "ReplyStatusConflict",
        };
        write!(f, "{}", s)
    }
}

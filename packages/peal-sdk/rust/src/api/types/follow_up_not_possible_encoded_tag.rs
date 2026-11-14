pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum FollowUpNotPossibleEncodedTag {
    FollowUpNotPossible,
}
impl fmt::Display for FollowUpNotPossibleEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::FollowUpNotPossible => "FollowUpNotPossible",
        };
        write!(f, "{}", s)
    }
}

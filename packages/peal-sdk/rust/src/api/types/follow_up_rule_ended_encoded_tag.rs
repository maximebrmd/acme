pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum FollowUpRuleEndedEncodedTag {
    FollowUpRuleEnded,
}
impl fmt::Display for FollowUpRuleEndedEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::FollowUpRuleEnded => "FollowUpRuleEnded",
        };
        write!(f, "{}", s)
    }
}

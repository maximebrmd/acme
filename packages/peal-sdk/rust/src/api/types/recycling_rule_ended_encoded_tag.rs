pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum RecyclingRuleEndedEncodedTag {
    RecyclingRuleEnded,
}
impl fmt::Display for RecyclingRuleEndedEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::RecyclingRuleEnded => "RecyclingRuleEnded",
        };
        write!(f, "{}", s)
    }
}

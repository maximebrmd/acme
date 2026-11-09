pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PlanLimitReachedEncodedTag {
    PlanLimitReached,
}
impl fmt::Display for PlanLimitReachedEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::PlanLimitReached => "PlanLimitReached",
        };
        write!(f, "{}", s)
    }
}

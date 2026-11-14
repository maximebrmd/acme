pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum UsageAllowanceReachedEncodedTag {
    UsageAllowanceReached,
}
impl fmt::Display for UsageAllowanceReachedEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::UsageAllowanceReached => "UsageAllowanceReached",
        };
        write!(f, "{}", s)
    }
}

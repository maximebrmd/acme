pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum BoostObjective {
    #[serde(rename = "engagement")]
    Engagement,
}
impl fmt::Display for BoostObjective {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::Engagement => "engagement",
        };
        write!(f, "{}", s)
    }
}

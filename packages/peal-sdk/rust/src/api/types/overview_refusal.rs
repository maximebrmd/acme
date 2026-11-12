pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum OverviewRefusal {
    #[serde(rename = "twoStepRequired")]
    TwoStepRequired,
}
impl fmt::Display for OverviewRefusal {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::TwoStepRequired => "twoStepRequired",
        };
        write!(f, "{}", s)
    }
}

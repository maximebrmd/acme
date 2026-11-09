pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum SignedRequestMethod {
    #[serde(rename = "PUT")]
    Put,
}
impl fmt::Display for SignedRequestMethod {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::Put => "PUT",
        };
        write!(f, "{}", s)
    }
}

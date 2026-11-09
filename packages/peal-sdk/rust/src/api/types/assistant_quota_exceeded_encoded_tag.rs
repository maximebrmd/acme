pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AssistantQuotaExceededEncodedTag {
    AssistantQuotaExceeded,
}
impl fmt::Display for AssistantQuotaExceededEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::AssistantQuotaExceeded => "AssistantQuotaExceeded",
        };
        write!(f, "{}", s)
    }
}

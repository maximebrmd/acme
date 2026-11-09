pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AssistantUnavailableEncodedTag {
    AssistantUnavailable,
}
impl fmt::Display for AssistantUnavailableEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::AssistantUnavailable => "AssistantUnavailable",
        };
        write!(f, "{}", s)
    }
}

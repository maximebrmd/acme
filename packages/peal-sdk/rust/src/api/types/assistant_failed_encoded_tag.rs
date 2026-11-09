pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AssistantFailedEncodedTag {
    AssistantFailed,
}
impl fmt::Display for AssistantFailedEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::AssistantFailed => "AssistantFailed",
        };
        write!(f, "{}", s)
    }
}

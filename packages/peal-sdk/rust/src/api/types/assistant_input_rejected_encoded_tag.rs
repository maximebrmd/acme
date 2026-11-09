pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AssistantInputRejectedEncodedTag {
    AssistantInputRejected,
}
impl fmt::Display for AssistantInputRejectedEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::AssistantInputRejected => "AssistantInputRejected",
        };
        write!(f, "{}", s)
    }
}

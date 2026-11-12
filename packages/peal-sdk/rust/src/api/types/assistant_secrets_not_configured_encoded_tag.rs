pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AssistantSecretsNotConfiguredEncodedTag {
    AssistantSecretsNotConfigured,
}
impl fmt::Display for AssistantSecretsNotConfiguredEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::AssistantSecretsNotConfigured => "AssistantSecretsNotConfigured",
        };
        write!(f, "{}", s)
    }
}

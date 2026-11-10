pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum WebhooksNotConfiguredEncodedTag {
    WebhooksNotConfigured,
}
impl fmt::Display for WebhooksNotConfiguredEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::WebhooksNotConfigured => "WebhooksNotConfigured",
        };
        write!(f, "{}", s)
    }
}

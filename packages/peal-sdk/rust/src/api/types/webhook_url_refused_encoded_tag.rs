pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum WebhookUrlRefusedEncodedTag {
    WebhookUrlRefused,
}
impl fmt::Display for WebhookUrlRefusedEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::WebhookUrlRefused => "WebhookUrlRefused",
        };
        write!(f, "{}", s)
    }
}

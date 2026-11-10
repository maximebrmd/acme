pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum WebhookEndpointDisabledEncodedTag {
    WebhookEndpointDisabled,
}
impl fmt::Display for WebhookEndpointDisabledEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::WebhookEndpointDisabled => "WebhookEndpointDisabled",
        };
        write!(f, "{}", s)
    }
}

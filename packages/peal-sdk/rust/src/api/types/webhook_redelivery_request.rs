pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(untagged)]
pub enum WebhookRedeliveryRequest {
    WebhookRedeliveryByIds(WebhookRedeliveryByIds),

    WebhookRedeliveryOfFailed(WebhookRedeliveryOfFailed),
}

impl WebhookRedeliveryRequest {
    pub fn is_webhook_redelivery_by_ids(&self) -> bool {
        matches!(self, Self::WebhookRedeliveryByIds(_))
    }

    pub fn is_webhook_redelivery_of_failed(&self) -> bool {
        matches!(self, Self::WebhookRedeliveryOfFailed(_))
    }

    pub fn as_webhook_redelivery_by_ids(&self) -> Option<&WebhookRedeliveryByIds> {
        match self {
            Self::WebhookRedeliveryByIds(value) => Some(value),
            _ => None,
        }
    }

    pub fn into_webhook_redelivery_by_ids(self) -> Option<WebhookRedeliveryByIds> {
        match self {
            Self::WebhookRedeliveryByIds(value) => Some(value),
            _ => None,
        }
    }

    pub fn as_webhook_redelivery_of_failed(&self) -> Option<&WebhookRedeliveryOfFailed> {
        match self {
            Self::WebhookRedeliveryOfFailed(value) => Some(value),
            _ => None,
        }
    }

    pub fn into_webhook_redelivery_of_failed(self) -> Option<WebhookRedeliveryOfFailed> {
        match self {
            Self::WebhookRedeliveryOfFailed(value) => Some(value),
            _ => None,
        }
    }
}

impl fmt::Display for WebhookRedeliveryRequest {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WebhookRedeliveryByIds(value) => write!(
                f,
                "{}",
                serde_json::to_string(value).unwrap_or_else(|_| format!("{:?}", value))
            ),
            Self::WebhookRedeliveryOfFailed(value) => write!(
                f,
                "{}",
                serde_json::to_string(value).unwrap_or_else(|_| format!("{:?}", value))
            ),
        }
    }
}

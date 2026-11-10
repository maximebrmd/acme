pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum TooManyWebhookEndpointsEncodedTag {
    TooManyWebhookEndpoints,
}
impl fmt::Display for TooManyWebhookEndpointsEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::TooManyWebhookEndpoints => "TooManyWebhookEndpoints",
        };
        write!(f, "{}", s)
    }
}

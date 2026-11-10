pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum TooManyWebhookSendsEncodedTag {
    TooManyWebhookSends,
}
impl fmt::Display for TooManyWebhookSendsEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::TooManyWebhookSends => "TooManyWebhookSends",
        };
        write!(f, "{}", s)
    }
}

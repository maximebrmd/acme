pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AssistantOffReason {
    #[serde(rename = "paymentMethod")]
    PaymentMethod,
}
impl fmt::Display for AssistantOffReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::PaymentMethod => "paymentMethod",
        };
        write!(f, "{}", s)
    }
}

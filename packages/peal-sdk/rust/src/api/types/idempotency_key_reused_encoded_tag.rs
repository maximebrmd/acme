pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum IdempotencyKeyReusedEncodedTag {
    IdempotencyKeyReused,
}
impl fmt::Display for IdempotencyKeyReusedEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::IdempotencyKeyReused => "IdempotencyKeyReused",
        };
        write!(f, "{}", s)
    }
}

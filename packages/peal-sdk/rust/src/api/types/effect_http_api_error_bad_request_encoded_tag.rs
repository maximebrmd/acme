pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum EffectHttpApiErrorBadRequestEncodedTag {
    BadRequest,
}
impl fmt::Display for EffectHttpApiErrorBadRequestEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::BadRequest => "BadRequest",
        };
        write!(f, "{}", s)
    }
}

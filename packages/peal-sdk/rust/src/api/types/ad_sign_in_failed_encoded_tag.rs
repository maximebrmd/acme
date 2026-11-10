pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AdSignInFailedEncodedTag {
    AdSignInFailed,
}
impl fmt::Display for AdSignInFailedEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::AdSignInFailed => "AdSignInFailed",
        };
        write!(f, "{}", s)
    }
}

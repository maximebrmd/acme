pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ConnectFailedEncodedTag {
    ConnectFailed,
}
impl fmt::Display for ConnectFailedEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::ConnectFailed => "ConnectFailed",
        };
        write!(f, "{}", s)
    }
}

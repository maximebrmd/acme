pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AdAccountBusyEncodedTag {
    AdAccountBusy,
}
impl fmt::Display for AdAccountBusyEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::AdAccountBusy => "AdAccountBusy",
        };
        write!(f, "{}", s)
    }
}

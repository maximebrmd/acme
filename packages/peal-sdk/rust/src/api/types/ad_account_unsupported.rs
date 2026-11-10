pub use crate::prelude::*;

/// Why Peal cannot connect an ad account: `timeZoneUnknown`, the network gave a time zone Peal does not know. Others may join it.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AdAccountUnsupported {
    #[serde(rename = "timeZoneUnknown")]
    TimeZoneUnknown,
}
impl fmt::Display for AdAccountUnsupported {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::TimeZoneUnknown => "timeZoneUnknown",
        };
        write!(f, "{}", s)
    }
}

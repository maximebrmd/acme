pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum UnknownChannelsEncodedTag {
    UnknownChannels,
}
impl fmt::Display for UnknownChannelsEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::UnknownChannels => "UnknownChannels",
        };
        write!(f, "{}", s)
    }
}

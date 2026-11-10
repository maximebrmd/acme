pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ChannelSetNameTakenEncodedTag {
    ChannelSetNameTaken,
}
impl fmt::Display for ChannelSetNameTakenEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::ChannelSetNameTaken => "ChannelSetNameTaken",
        };
        write!(f, "{}", s)
    }
}

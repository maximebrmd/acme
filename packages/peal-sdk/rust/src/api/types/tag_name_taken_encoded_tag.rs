pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum TagNameTakenEncodedTag {
    TagNameTaken,
}
impl fmt::Display for TagNameTakenEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::TagNameTaken => "TagNameTaken",
        };
        write!(f, "{}", s)
    }
}

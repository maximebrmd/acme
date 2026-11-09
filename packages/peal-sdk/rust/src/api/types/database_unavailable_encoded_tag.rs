pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum DatabaseUnavailableEncodedTag {
    DatabaseUnavailable,
}
impl fmt::Display for DatabaseUnavailableEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::DatabaseUnavailable => "DatabaseUnavailable",
        };
        write!(f, "{}", s)
    }
}

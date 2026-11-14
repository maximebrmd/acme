pub use crate::prelude::*;

/// A kind of website a channel publishes articles to.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum SitePlatform {
    #[serde(rename = "wordpress")]
    Wordpress,
}
impl fmt::Display for SitePlatform {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::Wordpress => "wordpress",
        };
        write!(f, "{}", s)
    }
}

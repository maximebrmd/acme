pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ShortLinkPage {
    #[serde(default)]
    pub items: Vec<ShortLink>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
    #[serde(default)]
    pub period: ShortLinkPeriod,
}

impl ShortLinkPage {
    pub fn builder() -> ShortLinkPageBuilder {
        <ShortLinkPageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ShortLinkPageBuilder {
    items: Option<Vec<ShortLink>>,
    next_cursor: Option<String>,
    period: Option<ShortLinkPeriod>,
}

impl ShortLinkPageBuilder {
    pub fn items(mut self, value: Vec<ShortLink>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    pub fn period(mut self, value: ShortLinkPeriod) -> Self {
        self.period = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ShortLinkPage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](ShortLinkPageBuilder::items)
    /// - [`period`](ShortLinkPageBuilder::period)
    pub fn build(self) -> Result<ShortLinkPage, BuildError> {
        Ok(ShortLinkPage {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            next_cursor: self.next_cursor,
            period: self
                .period
                .ok_or_else(|| BuildError::missing_field("period"))?,
        })
    }
}

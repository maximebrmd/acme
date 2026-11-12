pub use crate::prelude::*;

/// Query parameters for get
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ShortLinksGetQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<CalendarDay>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<CalendarDay>,
}

impl ShortLinksGetQueryRequest {
    pub fn builder() -> ShortLinksGetQueryRequestBuilder {
        <ShortLinksGetQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ShortLinksGetQueryRequestBuilder {
    from: Option<CalendarDay>,
    to: Option<CalendarDay>,
}

impl ShortLinksGetQueryRequestBuilder {
    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ShortLinksGetQueryRequest`].
    pub fn build(self) -> Result<ShortLinksGetQueryRequest, BuildError> {
        Ok(ShortLinksGetQueryRequest {
            from: self.from,
            to: self.to,
        })
    }
}

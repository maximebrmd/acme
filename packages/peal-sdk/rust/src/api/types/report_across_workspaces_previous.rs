pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ReportAcrossWorkspacesPrevious {
    #[serde(default)]
    pub from: CalendarDay,
    #[serde(default)]
    pub to: CalendarDay,
}

impl ReportAcrossWorkspacesPrevious {
    pub fn builder() -> ReportAcrossWorkspacesPreviousBuilder {
        <ReportAcrossWorkspacesPreviousBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReportAcrossWorkspacesPreviousBuilder {
    from: Option<CalendarDay>,
    to: Option<CalendarDay>,
}

impl ReportAcrossWorkspacesPreviousBuilder {
    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ReportAcrossWorkspacesPrevious`].
    /// This method will fail if any of the following fields are not set:
    /// - [`from`](ReportAcrossWorkspacesPreviousBuilder::from)
    /// - [`to`](ReportAcrossWorkspacesPreviousBuilder::to)
    pub fn build(self) -> Result<ReportAcrossWorkspacesPrevious, BuildError> {
        Ok(ReportAcrossWorkspacesPrevious {
            from: self.from.ok_or_else(|| BuildError::missing_field("from"))?,
            to: self.to.ok_or_else(|| BuildError::missing_field("to"))?,
        })
    }
}

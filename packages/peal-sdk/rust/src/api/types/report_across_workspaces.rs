pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ReportAcrossWorkspaces {
    #[serde(default)]
    pub from: CalendarDay,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
    #[serde(default)]
    pub previous: ReportAcrossWorkspacesPrevious,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
    #[serde(default)]
    pub to: CalendarDay,
    #[serde(default)]
    pub workspaces: Vec<WorkspaceReport>,
}

impl ReportAcrossWorkspaces {
    pub fn builder() -> ReportAcrossWorkspacesBuilder {
        <ReportAcrossWorkspacesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReportAcrossWorkspacesBuilder {
    from: Option<CalendarDay>,
    next_cursor: Option<String>,
    previous: Option<ReportAcrossWorkspacesPrevious>,
    time_zone: Option<String>,
    to: Option<CalendarDay>,
    workspaces: Option<Vec<WorkspaceReport>>,
}

impl ReportAcrossWorkspacesBuilder {
    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    pub fn previous(mut self, value: ReportAcrossWorkspacesPrevious) -> Self {
        self.previous = Some(value);
        self
    }

    pub fn time_zone(mut self, value: impl Into<String>) -> Self {
        self.time_zone = Some(value.into());
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    pub fn workspaces(mut self, value: Vec<WorkspaceReport>) -> Self {
        self.workspaces = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ReportAcrossWorkspaces`].
    /// This method will fail if any of the following fields are not set:
    /// - [`from`](ReportAcrossWorkspacesBuilder::from)
    /// - [`previous`](ReportAcrossWorkspacesBuilder::previous)
    /// - [`time_zone`](ReportAcrossWorkspacesBuilder::time_zone)
    /// - [`to`](ReportAcrossWorkspacesBuilder::to)
    /// - [`workspaces`](ReportAcrossWorkspacesBuilder::workspaces)
    pub fn build(self) -> Result<ReportAcrossWorkspaces, BuildError> {
        Ok(ReportAcrossWorkspaces {
            from: self.from.ok_or_else(|| BuildError::missing_field("from"))?,
            next_cursor: self.next_cursor,
            previous: self
                .previous
                .ok_or_else(|| BuildError::missing_field("previous"))?,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
            to: self.to.ok_or_else(|| BuildError::missing_field("to"))?,
            workspaces: self
                .workspaces
                .ok_or_else(|| BuildError::missing_field("workspaces"))?,
        })
    }
}

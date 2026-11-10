pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ImportCellProblem {
    pub column: ImportColumn,
    pub problem: ImportCellProblemProblem,
}

impl ImportCellProblem {
    pub fn builder() -> ImportCellProblemBuilder {
        <ImportCellProblemBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ImportCellProblemBuilder {
    column: Option<ImportColumn>,
    problem: Option<ImportCellProblemProblem>,
}

impl ImportCellProblemBuilder {
    pub fn column(mut self, value: ImportColumn) -> Self {
        self.column = Some(value);
        self
    }

    pub fn problem(mut self, value: ImportCellProblemProblem) -> Self {
        self.problem = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ImportCellProblem`].
    /// This method will fail if any of the following fields are not set:
    /// - [`column`](ImportCellProblemBuilder::column)
    /// - [`problem`](ImportCellProblemBuilder::problem)
    pub fn build(self) -> Result<ImportCellProblem, BuildError> {
        Ok(ImportCellProblem {
            column: self
                .column
                .ok_or_else(|| BuildError::missing_field("column"))?,
            problem: self
                .problem
                .ok_or_else(|| BuildError::missing_field("problem"))?,
        })
    }
}

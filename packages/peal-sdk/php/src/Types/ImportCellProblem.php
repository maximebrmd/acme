<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ImportCellProblem extends JsonSerializableType
{
    /**
     * @var value-of<ImportColumn> $column
     */
    #[JsonProperty('column')]
    public string $column;

    /**
     * @var value-of<ImportCellProblemProblem> $problem
     */
    #[JsonProperty('problem')]
    public string $problem;

    /**
     * @param array{
     *   column: value-of<ImportColumn>,
     *   problem: value-of<ImportCellProblemProblem>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->column = $values['column'];
        $this->problem = $values['problem'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}

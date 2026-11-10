<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ImportRowResultUnreadable extends JsonSerializableType
{
    /**
     * @var array<ImportCellProblem> $problems
     */
    #[JsonProperty('problems'), ArrayType([ImportCellProblem::class])]
    public array $problems;

    /**
     * @var int $row
     */
    #[JsonProperty('row')]
    public int $row;

    /**
     * @param array{
     *   problems: array<ImportCellProblem>,
     *   row: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->problems = $values['problems'];
        $this->row = $values['row'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}

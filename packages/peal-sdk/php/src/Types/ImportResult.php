<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ImportResult extends JsonSerializableType
{
    /**
     * @var int $created
     */
    #[JsonProperty('created')]
    public int $created;

    /**
     * @var bool $dryRun
     */
    #[JsonProperty('dryRun')]
    public bool $dryRun;

    /**
     * @var array<ImportRowResult> $rows
     */
    #[JsonProperty('rows'), ArrayType([ImportRowResult::class])]
    public array $rows;

    /**
     * @param array{
     *   created: int,
     *   dryRun: bool,
     *   rows: array<ImportRowResult>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->created = $values['created'];
        $this->dryRun = $values['dryRun'];
        $this->rows = $values['rows'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}

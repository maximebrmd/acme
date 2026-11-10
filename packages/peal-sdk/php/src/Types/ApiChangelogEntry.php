<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ApiChangelogEntry extends JsonSerializableType
{
    /**
     * @var int $additions
     */
    #[JsonProperty('additions')]
    public int $additions;

    /**
     * @var array<BreakingChange> $breaking
     */
    #[JsonProperty('breaking'), ArrayType([BreakingChange::class])]
    public array $breaking;

    /**
     * @var string $date
     */
    #[JsonProperty('date')]
    public string $date;

    /**
     * @var array<string> $deprecations
     */
    #[JsonProperty('deprecations'), ArrayType(['string'])]
    public array $deprecations;

    /**
     * @var array<string> $operations
     */
    #[JsonProperty('operations'), ArrayType(['string'])]
    public array $operations;

    /**
     * @var string $title
     */
    #[JsonProperty('title')]
    public string $title;

    /**
     * @param array{
     *   additions: int,
     *   breaking: array<BreakingChange>,
     *   date: string,
     *   deprecations: array<string>,
     *   operations: array<string>,
     *   title: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->additions = $values['additions'];
        $this->breaking = $values['breaking'];
        $this->date = $values['date'];
        $this->deprecations = $values['deprecations'];
        $this->operations = $values['operations'];
        $this->title = $values['title'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}

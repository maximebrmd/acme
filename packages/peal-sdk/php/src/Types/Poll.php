<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class Poll extends JsonSerializableType
{
    /**
     * @var array<string> $choices
     */
    #[JsonProperty('choices'), ArrayType(['string'])]
    public array $choices;

    /**
     * @var int $durationMinutes
     */
    #[JsonProperty('durationMinutes')]
    public int $durationMinutes;

    /**
     * @var ?bool $multipleChoice
     */
    #[JsonProperty('multipleChoice')]
    public ?bool $multipleChoice;

    /**
     * @param array{
     *   choices: array<string>,
     *   durationMinutes: int,
     *   multipleChoice?: ?bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->choices = $values['choices'];
        $this->durationMinutes = $values['durationMinutes'];
        $this->multipleChoice = $values['multipleChoice'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}

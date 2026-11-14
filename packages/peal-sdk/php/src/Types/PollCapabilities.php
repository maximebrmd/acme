<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PollCapabilities extends JsonSerializableType
{
    /**
     * @var TextLimit $choiceLimit
     */
    #[JsonProperty('choiceLimit')]
    public TextLimit $choiceLimit;

    /**
     * @var ?PollCapabilitiesDurationMinutes $durationMinutes
     */
    #[JsonProperty('durationMinutes')]
    public ?PollCapabilitiesDurationMinutes $durationMinutes;

    /**
     * @var int $maxChoices
     */
    #[JsonProperty('maxChoices')]
    public int $maxChoices;

    /**
     * @var int $minChoices
     */
    #[JsonProperty('minChoices')]
    public int $minChoices;

    /**
     * @var bool $multipleChoice
     */
    #[JsonProperty('multipleChoice')]
    public bool $multipleChoice;

    /**
     * @param array{
     *   choiceLimit: TextLimit,
     *   maxChoices: int,
     *   minChoices: int,
     *   multipleChoice: bool,
     *   durationMinutes?: ?PollCapabilitiesDurationMinutes,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->choiceLimit = $values['choiceLimit'];
        $this->durationMinutes = $values['durationMinutes'] ?? null;
        $this->maxChoices = $values['maxChoices'];
        $this->minChoices = $values['minChoices'];
        $this->multipleChoice = $values['multipleChoice'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}

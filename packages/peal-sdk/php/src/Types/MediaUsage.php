<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class MediaUsage extends JsonSerializableType
{
    /**
     * @var array<string> $drafts
     */
    #[JsonProperty('drafts'), ArrayType(['string'])]
    public array $drafts;

    /**
     * @var array<string> $scheduled
     */
    #[JsonProperty('scheduled'), ArrayType(['string'])]
    public array $scheduled;

    /**
     * @param array{
     *   drafts: array<string>,
     *   scheduled: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->drafts = $values['drafts'];
        $this->scheduled = $values['scheduled'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}

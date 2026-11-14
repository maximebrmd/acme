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
     * @var array<string> $draftArticles
     */
    #[JsonProperty('draftArticles'), ArrayType(['string'])]
    public array $draftArticles;

    /**
     * @var array<string> $scheduledArticles
     */
    #[JsonProperty('scheduledArticles'), ArrayType(['string'])]
    public array $scheduledArticles;

    /**
     * @param array{
     *   drafts: array<string>,
     *   scheduled: array<string>,
     *   draftArticles: array<string>,
     *   scheduledArticles: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->drafts = $values['drafts'];
        $this->scheduled = $values['scheduled'];
        $this->draftArticles = $values['draftArticles'];
        $this->scheduledArticles = $values['scheduledArticles'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}

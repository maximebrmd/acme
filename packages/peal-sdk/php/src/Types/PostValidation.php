<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PostValidation extends JsonSerializableType
{
    /**
     * @var bool $awaitsApproval
     */
    #[JsonProperty('awaitsApproval')]
    public bool $awaitsApproval;

    /**
     * @var array<ChannelPreview> $channels
     */
    #[JsonProperty('channels'), ArrayType([ChannelPreview::class])]
    public array $channels;

    /**
     * @var array<DuplicateOnChannel> $duplicates
     */
    #[JsonProperty('duplicates'), ArrayType([DuplicateOnChannel::class])]
    public array $duplicates;

    /**
     * @var ?PlanShortfall $planLimit
     */
    #[JsonProperty('planLimit')]
    public ?PlanShortfall $planLimit;

    /**
     * @var ?value-of<ScheduleCheck> $schedule
     */
    #[JsonProperty('schedule')]
    public ?string $schedule;

    /**
     * @var array<string> $unknownChannels
     */
    #[JsonProperty('unknownChannels'), ArrayType(['string'])]
    public array $unknownChannels;

    /**
     * @var array<string> $unknownMedia
     */
    #[JsonProperty('unknownMedia'), ArrayType(['string'])]
    public array $unknownMedia;

    /**
     * @var bool $valid
     */
    #[JsonProperty('valid')]
    public bool $valid;

    /**
     * @var array<ContentViolation> $violations
     */
    #[JsonProperty('violations'), ArrayType([ContentViolation::class])]
    public array $violations;

    /**
     * @param array{
     *   awaitsApproval: bool,
     *   channels: array<ChannelPreview>,
     *   duplicates: array<DuplicateOnChannel>,
     *   unknownChannels: array<string>,
     *   unknownMedia: array<string>,
     *   valid: bool,
     *   violations: array<ContentViolation>,
     *   planLimit?: ?PlanShortfall,
     *   schedule?: ?value-of<ScheduleCheck>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->awaitsApproval = $values['awaitsApproval'];
        $this->channels = $values['channels'];
        $this->duplicates = $values['duplicates'];
        $this->planLimit = $values['planLimit'] ?? null;
        $this->schedule = $values['schedule'] ?? null;
        $this->unknownChannels = $values['unknownChannels'];
        $this->unknownMedia = $values['unknownMedia'];
        $this->valid = $values['valid'];
        $this->violations = $values['violations'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
